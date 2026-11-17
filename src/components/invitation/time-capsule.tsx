"use client";

import { Lock, LockOpen } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CapsuleLetter } from "@/lib/capsule-store";
import { useNow } from "@/lib/use-now";
import { describeWeddingDate } from "@/lib/wedding-date";

import { dismissKeyboard, drawerClass, fieldClass, focusOnEnter, passwordProps, SheetForm, textareaClass } from "./sheet-form";
import { TemplateButton } from "./template-button";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "요청하지 못했어요.");
  return data as T;
}

/**
 * A letter box sealed until the couple's first anniversary. Guests drop letters in now; after
 * `opensAt` the couple opens it with their key (checked by the database). Nobody else can read the letters.
 */
export function TimeCapsule({ opensAt }: { opensAt: string }) {
  const now = useNow();
  const [count, setCount] = useState<number | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [letters, setLetters] = useState<CapsuleLetter[] | null>(null);
  const [pending, setPending] = useState(false);
  /** Kept if the sheet is closed by accident. */
  const [draft, setDraft] = useState({ name: "", message: "" });

  const opens = describeWeddingDate(opensAt);
  const isOpen = now !== null && now.getTime() >= new Date(opensAt).getTime();

  useEffect(() => {
    fetch("/api/capsule")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { count: number }) => setCount(data.count))
      .catch(() => {});
  }, []);

  async function write(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const data = await post<{ count: number }>("/api/capsule", Object.fromEntries(new FormData(e.currentTarget)));
      setCount(data.count);
      setDraft({ name: "", message: "" });
      dismissKeyboard();
      setWriteOpen(false);
      toast(`💌 타임캡슐에 넣었어요. ${opens.year}년 ${opens.monthDayKo}에 열려요.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "넣지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  async function unlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const data = await post<{ letters: CapsuleLetter[] }>("/api/capsule/open", { key: new FormData(e.currentTarget).get("key") });
      dismissKeyboard();
      setLetters(data.letters);
    } catch (err) {
      toast(err instanceof Error ? err.message : "열지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full rounded-[12px] border border-dashed border-line-strong px-4 py-4 text-center">
      <p className="flex items-center justify-center gap-1.5 text-[15px]">
        {isOpen ? <LockOpen className="size-4" strokeWidth={1.6} aria-hidden /> : <Lock className="size-4" strokeWidth={1.6} aria-hidden />}
        1주년 타임캡슐
      </p>
      <p className="mt-1.5 text-[13px] leading-[20px] text-ink-muted">
        {isOpen ? (
          "첫 결혼기념일이 되어 타임캡슐이 열렸어요."
        ) : (
          <>
            {opens.year}년 {opens.monthDayKo}, 두 사람의 첫 결혼기념일에
            <br />
            열어볼 편지를 남겨주세요. 그 전엔 아무도 볼 수 없어요.
          </>
        )}
        {count ? <span className="mt-0.5 block">{count}통의 편지가 잠들어 있어요</span> : null}
      </p>
      {isOpen ? (
        <TemplateButton className="mt-3 h-10" onClick={() => setOpenOpen(true)}>
          타임캡슐 열기
        </TemplateButton>
      ) : (
        <TemplateButton className="mt-3 h-10" onClick={() => setWriteOpen(true)}>
          편지 넣기
        </TemplateButton>
      )}

      <Drawer repositionInputs={false} open={writeOpen} onOpenChange={setWriteOpen}>
        <DrawerContent className={drawerClass}>
          <DrawerHeader>
            <DrawerTitle className="font-myeongjo text-[17px] font-normal text-ink">1주년 타임캡슐</DrawerTitle>
            <DrawerDescription className="text-ink-muted">
              {opens.year}년 {opens.monthDayKo}에 두 사람만 열어볼 수 있어요.
            </DrawerDescription>
          </DrawerHeader>
          <SheetForm
            onSubmit={write}
            submit={
              <TemplateButton tone="dark" type="submit" disabled={pending}>
                {pending ? "넣는 중…" : "타임캡슐에 넣기"}
              </TemplateButton>
            }
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tc-name">이름</Label>
              <Input
                id="tc-name"
                name="name"
                required
                maxLength={20}
                autoComplete="name"
                enterKeyHint="next"
                defaultValue={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                onKeyDown={focusOnEnter("message")}
                className={fieldClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tc-message">1년 뒤의 두 사람에게</Label>
              <Textarea
                id="tc-message"
                name="message"
                required
                maxLength={1000}
                rows={6}
                defaultValue={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                className={textareaClass}
              />
            </div>
          </SheetForm>
        </DrawerContent>
      </Drawer>

      <Drawer repositionInputs={false} open={openOpen} onOpenChange={setOpenOpen}>
        <DrawerContent className={drawerClass}>
          <DrawerHeader>
            <DrawerTitle className="font-myeongjo text-[17px] font-normal text-ink">타임캡슐</DrawerTitle>
            <DrawerDescription className="text-ink-muted">
              {letters ? `${letters.length}통의 편지` : "두 사람만 아는 열쇠를 입력해 주세요."}
            </DrawerDescription>
          </DrawerHeader>
          {letters ? (
            <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-8">
              {letters.map((l) => (
                <li key={l.id} className="rounded-[12px] border border-line bg-white/40 px-4 py-3.5 text-left">
                  <p className="text-[14px] font-bold">{l.name}</p>
                  <p className="mt-1.5 text-[14px] leading-[22px] break-words whitespace-pre-line">{l.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <SheetForm
              onSubmit={unlock}
              submit={
                <TemplateButton tone="dark" type="submit" disabled={pending}>
                  {pending ? "여는 중…" : "열기"}
                </TemplateButton>
              }
            >
              <Input name="key" {...passwordProps} required aria-label="열쇠" enterKeyHint="done" className={fieldClass} />
            </SheetForm>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
