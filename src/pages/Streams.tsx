import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { getVideoEmbedUrl } from '@/lib/helpers';

type LiveStream = {
  id: string;
  title: string;
  video_url: string;
  started_at: string;
  is_active: boolean;
};

function Player({ stream }: { stream: LiveStream }) {
  const embedUrl = getVideoEmbedUrl(stream.video_url);
  if (embedUrl) {
    return (
      <iframe
        title={stream.title}
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <div className="w-full h-full bg-black flex items-center justify-center text-muted-foreground text-sm px-4">
      Invalid YouTube stream URL
    </div>
  );
}

export default function Streams() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreams = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('live_streams')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(30);
        if (data) setStreams(data as LiveStream[]);
      } finally {
        setLoading(false);
      }
    };
    fetchStreams();
  }, []);

  const { activeStream, previousStreams } = useMemo(() => {
    const active = streams.find((s) => s.is_active) ?? null;
    const prev = streams.filter((s) => !s.is_active);
    return { activeStream: active, previousStreams: prev };
  }, [streams]);

  return (
    <>
      <Helmet>
        <title>Live Streams - {new Date().getFullYear()}</title>
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Live Streams</h1>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-56 bg-muted rounded-lg mb-3" />
                <div className="h-5 bg-muted rounded w-10/12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {activeStream && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="default">Active</Badge>
                  <div className="font-bold text-xl">{activeStream.title}</div>
                </div>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-black">
                      <Player stream={activeStream} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold mb-6">Previous streams</h2>
              {previousStreams.length === 0 ? (
                <div className="text-muted-foreground">No previous streams yet.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {previousStreams.map((s) => (
                    <Card key={s.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">Stream</Badge>
                        </div>
                        <div className="font-bold mb-3">{s.title}</div>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                          <Player stream={s} />
                        </div>
                        <div className="text-sm text-muted-foreground mt-3">
                          {new Date(s.started_at).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

