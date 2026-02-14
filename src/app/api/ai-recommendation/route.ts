import { NextRequest } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích thị trường chứng khoán Việt Nam với 20 năm kinh nghiệm. Nhiệm vụ: phân tích dữ liệu từ Market Dashboard V3 và đưa ra khuyến nghị đầu tư ngắn gọn, trực tiếp, có thể hành động ngay.

Nguyên tắc phân tích:
- Dựa trên Market Regime (Bull/Neutral/Bear/Blocked) để xác định mức độ tham gia thị trường
- Ưu tiên Tier 1A (PRIME + Entry State + SYNC) > Tier 2A > Fresh Breakout
- Kết hợp TO (Technical Oscillator) và RS (Relative Strength) để chọn mã tốt nhất
- Chú ý breadth, momentum, và 4-Layer Framework để đánh giá sức khỏe thị trường
- Xem xét GTGD (thanh khoản), MI (momentum), QTier (chất lượng cơ bản)

Yêu cầu output (BẮT BUỘC theo thứ tự):
1. **TỔNG QUAN THỊ TRƯỜNG** — Đánh giá 2-3 câu về tình hình chung
2. **NHẬN ĐỊNH XU HƯỚNG** — Ngắn hạn (1-2 tuần) và trung hạn (1-3 tháng)
3. **TOP MÃ KHUYẾN NGHỊ MUA** — 3-5 mã, mỗi mã kèm: lý do 1 dòng, giá hiện tại, mức mua vào gợi ý
4. **MÃ CẦN TRÁNH / CẮT LỖ** — Nếu có, kèm lý do ngắn
5. **CHIẾN LƯỢC HÀNH ĐỘNG** — Cụ thể: mua gì, bao nhiêu %, stop-loss ở đâu
6. **PHÂN BỔ VỐN GỢI Ý** — Tỷ lệ cash/stock theo regime hiện tại

Phong cách: ngắn gọn, bullet points, tập trung vào HÀNH ĐỘNG. Không giải thích dài dòng lý thuyết. Viết bằng tiếng Việt.
Disclaimer cuối: "Lưu ý: Đây là phân tích tham khảo từ AI, không phải khuyến nghị đầu tư chính thức."`;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY chưa được cấu hình trong .env.local' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { dashboardSummary } = await req.json();

    if (!dashboardSummary) {
      return new Response(
        JSON.stringify({ error: 'Missing dashboardSummary' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Hãy phân tích dữ liệu dashboard sau và đưa ra khuyến nghị đầu tư chi tiết:\n\n${dashboardSummary}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Claude API error ${response.status}: ${errorText.slice(0, 200)}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse SSE stream from Anthropic and forward text content
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body!.getReader();

    const readable = new ReadableStream({
      async start(controller) {
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;
                try {
                  const event = JSON.parse(jsonStr);
                  if (
                    event.type === 'content_block_delta' &&
                    event.delta?.type === 'text_delta' &&
                    event.delta.text
                  ) {
                    controller.enqueue(encoder.encode(event.delta.text));
                  }
                } catch {
                  // Ignore JSON parse errors for incomplete chunks
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
