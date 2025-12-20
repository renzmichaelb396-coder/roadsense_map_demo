import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Page() {
  const [hazards, setHazards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHazards = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('hazards')
        .select('id,type,severity,latitude,longitude,created_at')
        .eq('is_deleted', false);

      if (error) {
        console.error('Hazards fetch failed:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setHazards(data ?? []);
      setLoading(false);
    };

    loadHazards();
  }, []);

  return (
    <View style={{ backgroundColor: '#000', minHeight: '100vh', padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 20 }}>
        RoadSense LGU Dashboard
      </Text>

      {loading && <Text style={{ color: '#aaa' }}>Loading hazards…</Text>}

      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      {!loading && !error && (
        <Text style={{ color: '#0f0' }}>
          Hazards: {hazards.length}
        </Text>
      )}
    </View>
  );
}
