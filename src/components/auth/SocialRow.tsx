import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FacebookIcon from '../icons/FacebookIcon';
import GoogleIcon from '../icons/GoogleIcon';
import { colors } from '../../theme';
import SocialButton from './SocialButton';

type Props = {
  disabled?: boolean;
  onGoogle: () => void;
  onFacebook: () => void;
};

export default function SocialRow({ disabled, onGoogle, onFacebook }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.divider} />
      </View>
      <View style={styles.row}>
        <SocialButton
          label="Google"
          icon={<GoogleIcon />}
          onPress={onGoogle}
          disabled={disabled}
        />
        <SocialButton
          label="Facebook"
          icon={<FacebookIcon />}
          onPress={onFacebook}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
