"use client";

import { Menu, PenLine } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchGuestbook } from "@/lib/guestbook-client";
import type { GuestbookEntry } from "@/lib/guestbook-store";

import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { dismissKeyboard, drawerClass, fieldClass, focusOnEnter, passwordProps, SheetForm, textareaClass } from "./sheet-form";
import { TemplateButton } from "./template-button";
import { TimeCapsule } from "./time-capsule";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function EntryCard({ entry, onDelete }: { entry: GuestbookEntry; onDelete?: (entry: GuestbookEntry) => void }) {
  return (
    <li className="rounded-[12px] border border-line bg-white/40 px-4 py-3.5 text-left">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-bold">{entry.name}</p>
        <div className="flex items-center gap-2 text-[12px] text-ink-muted">
          <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
          {onDelete ? (
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => onDelete(entry)}>
              삭제
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-1.5 text-[14px] leading-[22px] break-words whitespace-pre-line">{entry.message}</p>
    </li>
  );
}

export function Guestbook({ title, previewCount, capsuleOpensAt }: { title: string; previewCount: number; capsuleOpensAt?: string }) {
  const [entries, setEntries] = useState<GuestbookEntry[] | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const [deleting, setDeleting] = useState<GuestbookEntry | null>(null);
  const [pending, setPending] = useState(false);
  /** What the guest has typed so far, kept if the sheet is closed by accident (the password is not kept). */
  const [draft, setDraft] = useState({ name: "", message: "" });

  useEffect(() => {
    fetchGuestbook()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "등록하지 못했어요.");
      setEntries((prev) => [data.entry, ...(prev ?? [])]);
      setDraft({ name: "", message: "" });
      dismissKeyboard();
      setWriteOpen(false);
      toast("방명록이 등록되었습니다.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "등록하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deleting) return;
    const password = new FormData(e.currentTarget).get("password");
    setPending(true);
    try {
      const res = await fetch(`/api/guestbook/${deleting.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok && res.status !== 404) throw new Error((await res.json()).error ?? "삭제하지 못했어요.");
      setEntries((prev) => prev?.filter((x) => x.id !== deleting.id) ?? []);
      dismissKeyboard();
      setDeleting(null);
      toast("삭제되었습니다.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "삭제하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  const preview = entries?.slice(0, previewCount) ?? [];

  return (
    <Reveal id="guestbook" aria-label={title} className="flex scroll-mt-4 flex-col items-center px-4 py-12">
      <SectionHeading label="BOARDS" title={title} />

      {preview.length ? (
        <ul className="mt-4 flex w-full flex-col gap-2">
          {preview.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex h-20 items-center text-[15px] text-ink-muted">
          {entries === null ? " " : "남겨진 방명록이 없습니다."}
        </p>
      )}

      <div className="flex w-full gap-2.5 py-6">
        <TemplateButton className="flex-1" icon={<Menu className="text-ink/60" />} onClick={() => setListOpen(true)}>
          전체 보기
        </TemplateButton>
        <TemplateButton className="flex-1" icon={<PenLine />} onClick={() => setWriteOpen(true)}>
          작성하기
        </TemplateButton>
      </div>

      {capsuleOpensAt ? <TimeCapsule opensAt={capsuleOpensAt} /> : null}

      <Drawer open={listOpen} onOpenChange={setListOpen}>
        <DrawerContent className={drawerClass}>
          <DrawerHeader>
            <DrawerTitle className="font-myeongjo text-[17px] font-normal text-ink">{title}</DrawerTitle>
            <DrawerDescription className="text-ink-muted">총 {entries?.length ?? 0}개의 축하 메시지</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-8">
            {entries?.length ? (
              <ul className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} onDelete={setDeleting} />
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-[15px] text-ink-muted">남겨진 방명록이 없습니다.</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer repositionInputs={false} open={writeOpen} onOpenChange={setWriteOpen}>
        <DrawerContent className={drawerClass}>
          <DrawerHeader>
            <DrawerTitle className="font-myeongjo text-[17px] font-normal text-ink">방명록 작성</DrawerTitle>
            <DrawerDescription className="text-ink-muted">두 사람에게 축하의 마음을 남겨주세요.</DrawerDescription>
          </DrawerHeader>
          <SheetForm
            onSubmit={submit}
            submit={
              <TemplateButton tone="dark" type="submit" disabled={pending}>
                {pending ? "등록 중…" : "등록하기"}
              </TemplateButton>
            }
          >
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="gb-name">이름</Label>
                <Input
                  id="gb-name"
                  name="name"
                  required
                  maxLength={20}
                  autoComplete="name"
                  enterKeyHint="next"
                  defaultValue={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  onKeyDown={focusOnEnter("password")}
                  className={fieldClass}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="gb-password">비밀번호</Label>
                <Input
                  id="gb-password"
                  name="password"
                  {...passwordProps}
                  required
                  minLength={4}
                  maxLength={20}
                  placeholder="삭제할 때 필요"
                  enterKeyHint="next"
                  onKeyDown={focusOnEnter("message")}
                  className={`${fieldClass} placeholder:text-[13px]`}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gb-message">내용</Label>
              <Textarea
                id="gb-message"
                name="message"
                required
                maxLength={500}
                rows={5}
                placeholder="두 사람에게 전할 축하 메시지"
                defaultValue={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                className={textareaClass}
              />
            </div>
          </SheetForm>
        </DrawerContent>
      </Drawer>

      <Drawer repositionInputs={false} open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DrawerContent className={drawerClass}>
          <DrawerHeader>
            <DrawerTitle className="font-myeongjo text-[17px] font-normal text-ink">방명록 삭제</DrawerTitle>
            <DrawerDescription className="text-ink-muted">작성할 때 입력한 비밀번호를 입력해 주세요.</DrawerDescription>
          </DrawerHeader>
          <SheetForm
            onSubmit={confirmDelete}
            submit={
              <TemplateButton tone="dark" type="submit" disabled={pending}>
                {pending ? "삭제 중…" : "삭제하기"}
              </TemplateButton>
            }
          >
            <Input name="password" {...passwordProps} required aria-label="비밀번호" enterKeyHint="done" className={fieldClass} />
          </SheetForm>
        </DrawerContent>
      </Drawer>
    </Reveal>
  );
}
