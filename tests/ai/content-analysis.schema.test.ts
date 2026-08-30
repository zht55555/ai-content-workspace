import { describe, expect, it } from "vitest";

import { ContentAnalysisResultSchema } from "@/src/ai/schemas/content-analysis.schema";

const validResult = {
  analysis: {
    topic: "异地恋情侣关系",
    contentType: "剧情短视频",
    targetAudience: ["20-35岁情侣", "异地恋人群"],
    coreMessage: "沟通是维系关系的关键。",
    summary: "一对异地恋情侣通过一次误会重新理解彼此。",
  },
  hook: {
    type: "冲突型钩子",
    content: "她等了三小时，却只收到一句分手。",
    score: 86,
    reason: "开头直接抛出关系危机。",
    strengths: ["冲突明确"],
    problems: ["缺少人物背景"],
  },
  structure: [
    { stage: "HOOK", content: "关系危机出现。", purpose: "吸引注意力", startOrder: 1, endOrder: 1 },
    { stage: "CONFLICT", content: "双方产生误会。", purpose: "推动矛盾", startOrder: 2, endOrder: 3 },
  ],
  emotion: {
    overallTone: "克制而温暖",
    emotionalArc: "怀疑到理解",
    emotionPoints: [{ type: "SAD", content: "收到分手消息", intensity: 72, reason: "关系面临失去" }],
  },
  optimization: {
    strengths: ["冲突进入较快"],
    weaknesses: ["转折铺垫略少"],
    keep: ["保留核心误会"],
    change: ["补充人物动机"],
    rhythmSuggestions: ["缩短中段解释"],
    structureSuggestions: ["提前埋下沟通线索"],
    contentSuggestions: ["增加一个具体细节"],
  },
  generatedScript: {
    title: "三小时后的那句话",
    coreDirection: "围绕误会和沟通展开",
    script: "她删掉了分手短信，决定先听他解释。",
    notes: ["控制旁白比例"],
  },
  marketing: {
    titles: ["异地恋最怕的不是距离"],
    coverTexts: ["她等了三小时"],
    publishCopy: "有些误会，只有认真沟通才能解开。",
    keywords: ["异地恋", "情侣沟通"],
  },
};

describe("ContentAnalysisResultSchema", () => {
  it("accepts a complete structured content analysis result", () => {
    expect(ContentAnalysisResultSchema.parse(validResult)).toEqual(validResult);
  });

  it("rejects hook scores above 100", () => {
    expect(() => ContentAnalysisResultSchema.parse({ ...validResult, hook: { ...validResult.hook, score: 101 } })).toThrow();
  });

  it("rejects unsupported structure stages", () => {
    expect(() => ContentAnalysisResultSchema.parse({ ...validResult, structure: [{ ...validResult.structure[0], stage: "UNKNOWN" }] })).toThrow();
  });

  it("rejects a missing required analysis field", () => {
    const analysisWithoutSummary = {
      topic: validResult.analysis.topic,
      contentType: validResult.analysis.contentType,
      targetAudience: validResult.analysis.targetAudience,
      coreMessage: validResult.analysis.coreMessage,
    };
    expect(() => ContentAnalysisResultSchema.parse({ ...validResult, analysis: analysisWithoutSummary })).toThrow();
  });

  it("rejects arrays larger than the schema limit", () => {
    const tooManyTitles = Array.from({ length: 6 }, (_, index) => `标题 ${index + 1}`);
    expect(() => ContentAnalysisResultSchema.parse({ ...validResult, marketing: { ...validResult.marketing, titles: tooManyTitles } })).toThrow();
  });
});
