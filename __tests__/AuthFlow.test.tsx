/**
 * @format
 */

import React from 'react';
import { Animated, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { ReactTestInstance } from 'react-test-renderer';
import AuthFlow from '../src/screens/AuthFlow';
import { supabase } from '../src/lib/supabase';

// `useNativeDriver: true` tries to connect to a real native view to drive the
// animation, which react-test-renderer's fake tree can't provide and crashes.
// Animated.delay also schedules a real setTimeout internally (even with
// Animated.timing mocked, since it calls a private helper, not the public
// API) that can outlive a test and fire against an unmounted tree. Screens
// only use these for visual entrance/exit, so finishing everything
// immediately keeps that untestable detail out of the way.
type FakeAnimation = {
  start: (callback?: (result: { finished: boolean }) => void) => void;
  stop: () => void;
  reset: () => void;
};

const instant = (): FakeAnimation => ({
  start: callback => callback?.({ finished: true }),
  stop: () => {},
  reset: () => {},
});

jest.spyOn(Animated, 'timing').mockImplementation(((
  value: Animated.Value,
  config: { toValue: number },
) => ({
  start: (callback?: (result: { finished: boolean }) => void) => {
    value.setValue(config.toValue);
    callback?.({ finished: true });
  },
  stop: () => {},
  reset: () => {},
})) as unknown as typeof Animated.timing);

jest.spyOn(Animated, 'delay').mockImplementation(
  (() => instant()) as unknown as typeof Animated.delay,
);

jest.spyOn(Animated, 'stagger').mockImplementation(((
  _step: number,
  animations: FakeAnimation[],
) => ({
  start: (callback?: (result: { finished: boolean }) => void) => {
    animations.forEach(a => a.start());
    callback?.({ finished: true });
  },
  stop: () => animations.forEach(a => a.stop()),
  reset: () => animations.forEach(a => a.reset()),
})) as unknown as typeof Animated.stagger);

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

const mockAuth = supabase.auth as unknown as {
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  signInWithOAuth: jest.Mock;
  exchangeCodeForSession: jest.Mock;
};

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let mountedTree: ReactTestRenderer.ReactTestRenderer | null = null;

function render(onAuthenticated = jest.fn()) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <AuthFlow onAuthenticated={onAuthenticated} />
      </SafeAreaProvider>,
    );
  });
  mountedTree = tree;
  return { tree, onAuthenticated };
}

afterEach(() => {
  if (mountedTree) {
    ReactTestRenderer.act(() => mountedTree!.unmount());
    mountedTree = null;
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

const labelOf = (node: ReactTestInstance) =>
  [node.props.children].flat().join('');

function findPressable(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const texts = tree.root
    .findAllByType(Text)
    .filter(text => labelOf(text) === label);
  for (const text of texts) {
    let node: ReactTestInstance | null = text;
    while (node && !node.props.onPress) {
      node = node.parent;
    }
    if (node) return node;
  }
  throw new Error(`Nothing tappable with the text "${label}"`);
}

/** Presses a plain, synchronous button (switching screens, toggling state). */
function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const target = findPressable(tree, label);
  ReactTestRenderer.act(() => target.props.onPress());
}

/**
 * Presses a button that kicks off an async handler (a supabase call) and
 * flushes its promise chain within the same act() scope. Splitting the press
 * and the flush into separate act() calls — one sync, one async — leaves a
 * window where the async continuation isn't tracked by any act(), which
 * corrupts react-test-renderer's state for the rest of the file.
 */
async function pressAndSettle(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const target = findPressable(tree, label);
  await ReactTestRenderer.act(async () => {
    target.props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Types into the nth text field on screen, in visual order. */
function type(
  tree: ReactTestRenderer.ReactTestRenderer,
  index: number,
  value: string,
) {
  const inputs = tree.root.findAllByType(TextInput);
  ReactTestRenderer.act(() => inputs[index].props.onChangeText(value));
}

const hasText = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
  tree.root.findAllByType(Text).some(text => labelOf(text) === label);

test('starts on the login screen', () => {
  const { tree } = render();
  expect(hasText(tree, 'Welcome back')).toBe(true);
  expect(hasText(tree, 'Create account')).toBe(false);
});

test('switches between login and signup', () => {
  const { tree } = render();

  press(tree, 'Create an account');
  expect(hasText(tree, 'Create account')).toBe(true);
  expect(hasText(tree, 'Welcome back')).toBe(false);

  press(tree, 'Log in');
  expect(hasText(tree, 'Welcome back')).toBe(true);
});

test('logs in with email and password', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({ error: null });
  const { tree, onAuthenticated } = render();

  type(tree, 0, 'focus@example.com');
  type(tree, 1, 'hunter2');
  await pressAndSettle(tree, 'Log in');

  expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
    email: 'focus@example.com',
    password: 'hunter2',
  });
  expect(onAuthenticated).toHaveBeenCalledTimes(1);
});

test('rejects an empty login without calling the server', async () => {
  const { tree, onAuthenticated } = render();

  await pressAndSettle(tree, 'Log in');

  expect(hasText(tree, 'Please enter your email.')).toBe(true);
  expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  expect(onAuthenticated).not.toHaveBeenCalled();
});

test('rejects a malformed email on login', async () => {
  const { tree } = render();

  type(tree, 0, 'not-an-email');
  type(tree, 1, 'hunter2');
  await pressAndSettle(tree, 'Log in');

  expect(hasText(tree, 'Please enter a valid email address.')).toBe(true);
  expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
});

test('shows an error and does not continue on failed login', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({
    error: { message: 'Invalid login credentials' },
  });
  const { tree, onAuthenticated } = render();

  type(tree, 0, 'focus@example.com');
  type(tree, 1, 'wrong');
  await pressAndSettle(tree, 'Log in');

  expect(hasText(tree, 'Invalid login credentials')).toBe(true);
  expect(onAuthenticated).not.toHaveBeenCalled();
});

test('signup with immediate session continues into the app', async () => {
  mockAuth.signUp.mockResolvedValue({ data: { session: {} }, error: null });
  const { tree, onAuthenticated } = render();

  press(tree, 'Create an account');
  type(tree, 0, 'New User');
  type(tree, 1, 'new@example.com');
  type(tree, 2, 'hunter2');
  await pressAndSettle(tree, 'Create account');

  expect(onAuthenticated).toHaveBeenCalledTimes(1);
});

test('rejects a too-short password on signup', async () => {
  const { tree } = render();

  press(tree, 'Create an account');
  type(tree, 0, 'New User');
  type(tree, 1, 'new@example.com');
  type(tree, 2, '123');
  await pressAndSettle(tree, 'Create account');

  expect(
    hasText(tree, 'Password must be at least 6 characters.'),
  ).toBe(true);
  expect(mockAuth.signUp).not.toHaveBeenCalled();
});

test('signup that needs email confirmation returns to login with a notice', async () => {
  mockAuth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  const { tree, onAuthenticated } = render();

  press(tree, 'Create an account');
  type(tree, 0, 'New User');
  type(tree, 1, 'new@example.com');
  type(tree, 2, 'hunter2');
  await pressAndSettle(tree, 'Create account');

  expect(onAuthenticated).not.toHaveBeenCalled();
  expect(hasText(tree, 'Welcome back')).toBe(true);
  expect(
    hasText(tree, 'Check your email to confirm your account, then log in.'),
  ).toBe(true);
});

test('rejects an empty email on forgot password', async () => {
  const { tree } = render();

  press(tree, 'Forgot password?');
  await pressAndSettle(tree, 'Send reset link');

  expect(hasText(tree, 'Please enter your email.')).toBe(true);
  expect(mockAuth.resetPasswordForEmail).not.toHaveBeenCalled();
});

test('forgot password sends a reset link', async () => {
  mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
  const { tree } = render();

  press(tree, 'Forgot password?');
  expect(hasText(tree, 'Reset password')).toBe(true);

  type(tree, 0, 'focus@example.com');
  await pressAndSettle(tree, 'Send reset link');

  expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
    'focus@example.com',
    expect.objectContaining({ redirectTo: expect.any(String) }),
  );
  expect(
    hasText(
      tree,
      'Check focus@example.com for a link to reset your password.',
    ),
  ).toBe(true);
});
