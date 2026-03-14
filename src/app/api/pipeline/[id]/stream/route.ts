export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let lastIndex = 0;
      let closed = false;

      const interval = setInterval(() => {
        if (closed) return;

        try {
          const global = globalThis as any;
          const events = global.__pipelineEvents?.[id] || [];
          const status = global.__pipelineStatus?.[id];

          // Send new events
          if (lastIndex < events.length) {
            while (lastIndex < events.length) {
              const event = events[lastIndex];
              const data = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(data));
              lastIndex++;
            }
          } else {
            // Heartbeat to keep connection alive
            controller.enqueue(encoder.encode(': ping\n\n'));
          }

          // Close stream when pipeline is done
          if (status === 'completed' || status === 'failed') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'stream_end', data: { status }, timestamp: new Date().toISOString() })}\n\n`)
            );
            clearInterval(interval);
            closed = true;
            controller.close();
          }
        } catch {
          clearInterval(interval);
          closed = true;
          try { controller.close(); } catch {}
        }
      }, 5000); // Check every 5s

      // Connection remains open indefinitely until pipeline finishes
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
