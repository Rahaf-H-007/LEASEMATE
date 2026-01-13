const Groq = require("groq-sdk");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
module.exports = { analyzeReviewWithOpenAI };
/**
 * Analyze a review comment using Groq's Llama-4 model.
 * @param {string} comment
 * @returns {Promise<{ sentiment: string|null, abusive: boolean, keywords: string[] }>}
 */
async function analyzeReviewWithOpenAI(comment) {
  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content: `
أنت مساعد ذكاء اصطناعي يتلقى مراجعة باللغة العربية أو الإنجليزية من مستأجر أو مالك عقار.
- استخرج ما يلي:
    - sentiment: هل المراجعة إيجابية أو سلبية أو محايدة؟
    - abusive: هل تحتوي المراجعة على أي كلمات مسيئة أو مهينة؟
    - keywords: كلمات أساسية هامة تلخص محتوى المراجعة.
قم بالرد بصيغة JSON فقط مثل:
{"sentiment":"ايجابي","abusive":false,"keywords":["تأخير في الصيانة","المعاملة جيدة"]}
          `,
        },
        {
          role: "user",
          content: comment,
        },
      ],
      temperature: 0,
      max_completion_tokens: 1024,
    });

    const text = completion.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(text);
      console.log("Groq response raw:", text);
    } catch (err) {
      console.error("❌ Failed to parse Groq JSON:", text);
      return {
        sentiment: null,
        abusive: false,
        keywords: [],
      };
    }

    return {
      sentiment: result.sentiment || null,
      abusive: result.abusive || false,
      keywords: result.keywords || [],
    };
  } catch (error) {
    console.error("❌ Error calling Groq API:", error);
    return {
      sentiment: null,
      abusive: false,
      keywords: [],
    };
  }
}
