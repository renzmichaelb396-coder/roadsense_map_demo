import { Link } from 'expo-router';
import { Text } from 'react-native';

export function ExternalLink(props: { href: string; children: React.ReactNode }) {
  return (
    <Link href={props.href as any}>
      <Text>{props.children}</Text>
    </Link>
  );
}
