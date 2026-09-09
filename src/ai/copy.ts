import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import YAML from "yaml";
import type { BrandKit, TemplateDef } from "../brand.js";
import type { PlanPost } from "../plan.js";
import { CopySchema, type Copy } from "../post.js";

export interface CopyGenerator {
  generate(post: PlanPost, template: TemplateDef): Promise<Copy>;
  revise(post: PlanPost, template: TemplateDef, previous: Copy, feedback: string): Promise<Copy>;
}

export function buildSystemPrompt(kit: BrandKit): string {
  const brandYaml = YAML.stringify(kit.brand);
  return [
    `You write social media content for the brand below. You are ghost-writing for ${kit.brand.owner}, in first person.`,
    "Everything you write must sound like the brand voice, follow the strategy, and respect the compliance rules. Read the brand kit and strategy first.",
    "",
    "<brand_kit>",
    brandYaml.trim(),
    "</brand_kit>",
    "",
    "<strategy>",
    kit.strategy.trim() || "(no strategy file)",
    "</strategy>",
    "",
    "How to write:",
    "- One idea per post. The hook is the first line of every caption and must work without the design.",
    "- Captions are plain text with line breaks between thoughts. No markdown, no bullet symbols, no hashtags inside the caption (hashtags go in the separate field).",
    "- Write a distinct caption for every requested channel, adapted to that channel's notes and caption_max in the brand kit. Do not just copy the same text.",
    "- End every caption with the CTA the post asks for, phrased naturally. Use the cta_long text from the brand kit's offers as the basis, or an engagement question when cta is 'engagement'.",
    "- Design copy is short: it has to fit on a 1080px image in large type. Respect the word limits in the schema.",
    "- Never use the phrases listed under voice.we_avoid. Follow the emoji policy.",
    "- Do not invent client names, revenue figures, or statistics that are not in the post brief. If the brief says numbers are illustrative, phrase them as examples.",
    "- Language: write in the language given under voice.language.",
  ].join("\n");
}

export function buildPostBrief(post: PlanPost, template: TemplateDef, kit: BrandKit): string {
  const pillar = kit.brand.pillars.find((p) => p.key === post.pillar);
  const offer = kit.brand.offers[post.cta];
  const slideRule = template.kind === "carousel"
    ? `This is a carousel. Write between ${template.slides.min} and ${template.slides.max} body slides in design.slides (cover and closing slide are generated separately from headline/subheadline/cta).`
    : "This is a single image. design.slides must be an empty array.";
  return [
    `Post id: ${post.id}  (week ${post.week}${post.theme ? `, theme: "${post.theme}"` : ""})`,
    `Scheduled: ${post.scheduledAt}`,
    `Channels: ${post.channels.join(", ")}`,
    `Pillar: ${pillar?.name ?? post.pillar} — ${pillar?.description ?? ""}`,
    `Format: ${post.format} (template "${post.template}")`,
    `Topic: ${post.topic}`,
    post.angle ? `Angle: ${post.angle}` : "",
    post.notes ? `Notes / facts you may use: ${post.notes}` : "",
    `CTA: ${post.cta}${offer ? ` → "${offer.cta_long}"` : " → end with a question that invites comments"}`,
    post.approved_story ? "Client story is approved: real details may be used." : "No real client names. Say 'one of our founders' or '(name changed)'.",
    "",
    slideRule,
    `Return captions for exactly these channels: ${post.channels.join(", ")}.`,
  ].filter(Boolean).join("\n");
}

export class ClaudeCopyGenerator implements CopyGenerator {
  private client: Anthropic;
  private system: string;

  constructor(private kit: BrandKit, private model: string, apiKey?: string) {
    this.client = new Anthropic(apiKey ? { apiKey } : {});
    this.system = buildSystemPrompt(kit);
  }

  private async call(userText: string): Promise<Copy> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: [{ type: "text", text: this.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userText }],
      output_config: { format: zodOutputFormat(CopySchema) },
    });
    if (response.stop_reason === "refusal") {
      throw new Error(`The model declined to write this post (${response.stop_details?.category ?? "no category"}). Rephrase the topic in the content plan.`);
    }
    if (!response.parsed_output) {
      throw new Error("The model returned no parsable copy. Try again or lower the post's complexity.");
    }
    return CopySchema.parse(response.parsed_output);
  }

  generate(post: PlanPost, template: TemplateDef): Promise<Copy> {
    return this.call(`Write this post.\n\n${buildPostBrief(post, template, this.kit)}`);
  }

  revise(post: PlanPost, template: TemplateDef, previous: Copy, feedback: string): Promise<Copy> {
    return this.call([
      "Revise this post based on the reviewer's feedback. Keep what was not criticised. Apply the feedback precisely.",
      "",
      buildPostBrief(post, template, this.kit),
      "",
      "<previous_version>",
      JSON.stringify(previous, null, 2),
      "</previous_version>",
      "",
      "<reviewer_feedback>",
      feedback.trim(),
      "</reviewer_feedback>",
    ].join("\n"));
  }
}

/** Deterministic generator for tests and `--offline` dry runs. */
export class StubCopyGenerator implements CopyGenerator {
  async generate(post: PlanPost, template: TemplateDef): Promise<Copy> {
    const n = template.kind === "carousel" ? template.slides.min : 0;
    return {
      hook: `Still relying only on ads? (${post.id})`,
      captions: post.channels.map((channel) => ({
        channel,
        text: `Still relying only on ads? (${post.id})\n\n${post.topic}\n\nComment GUIDE and I'll send you the free guide.`,
      })),
      hashtags: ["partnermarketing", "femalefounders", "creatormarketing"],
      alt_text: `Design about: ${post.topic}`,
      design: {
        headline: "More revenue without ad spend",
        subheadline: "The channel most founders leave untapped.",
        cta: "Get the free guide",
        slides: Array.from({ length: n }, (_, i) => ({ title: `Step ${i + 1}`, body: `Slide ${i + 1} body copy for ${post.topic.slice(0, 40)}…` })),
      },
      reviewer_note: "Stub copy (offline mode). Replace with real generation.",
    };
  }
  async revise(post: PlanPost, template: TemplateDef, previous: Copy, feedback: string): Promise<Copy> {
    const c = await this.generate(post, template);
    return { ...previous, hook: c.hook, reviewer_note: `Revised (stub) with feedback: ${feedback}` };
  }
}
