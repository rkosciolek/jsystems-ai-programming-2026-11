"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { CATEGORIES, makeCaseInputSchema, todayInWarsaw, type CategoryId, type CaseType, type Channel } from "../../lib/domain";
import { pl } from "../../lib/i18n/pl";

export type Draft = {
  caseType?: "complaint" | "return";
  category?: CategoryId;
  model: string;
  purchaseDate: string;
  channel?: "online" | "store";
  description: string;
  photo?: File;
};

export function emptyDraft(): Draft {
  return { model: "", purchaseDate: "", description: "" };
}

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type CaseFormProps = {
  initialDraft: Draft;
  serverFieldErrors?: Partial<Record<keyof Draft, string>>;
  serviceError?: boolean;
  onSubmit(draft: Draft): void;
  onRetry?(draft: Draft): void;
  disabled?: boolean;
};

const FIELD_ORDER: (keyof Draft)[] = [
  "caseType", "category", "model", "purchaseDate", "channel", "description", "photo",
];

const imageExtensions: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function isAcceptedPhoto(file: File): boolean {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (file.type) return allowedTypes.includes(file.type);
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension !== undefined && imageExtensions[extension] !== undefined;
}

function formatFileSize(bytes: number): string {
  const isMegabyteSize = bytes >= 1024 * 1024;
  const value = bytes / (isMegabyteSize ? 1024 * 1024 : 1024);
  return new Intl.NumberFormat("pl-PL", {
    style: "unit",
    unit: isMegabyteSize ? "megabyte" : "kilobyte",
    unitDisplay: "short",
    maximumFractionDigits: 2,
  }).format(value);
}

function idForError(field: keyof Draft): string {
  return `${field}-error`;
}

function focusField(field: keyof Draft): void {
  const selectors: Record<keyof Draft, string> = {
    caseType: '[data-field="caseType"] [role="radio"]',
    category: "#category-trigger",
    model: "#model",
    purchaseDate: "#purchaseDate",
    channel: '[data-field="channel"] [role="radio"]',
    description: "#description",
    photo: "[data-drop-zone]",
  };
  document.querySelector<HTMLElement>(selectors[field])?.focus();
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-sm text-destructive">{message}</p>;
}

const clientSchema = makeCaseInputSchema(todayInWarsaw())
  .and(z.object({
    caseType: z.string().optional(),
    description: z.string(),
    photo: z.custom<File>().optional(),
  }).superRefine(({ caseType, description, photo }, ctx) => {
    const descriptionLength = description.trim().length;
    if (descriptionLength > 2000) {
      ctx.addIssue({
        code: "custom",
        path: ["description"],
        message: caseType === "complaint" ? pl.errors.description : pl.errors.descriptionTooLong,
      });
    } else if (caseType === "complaint" && descriptionLength < 20) {
      ctx.addIssue({ code: "custom", path: ["description"], message: pl.errors.description });
    }
    if (!photo) {
      ctx.addIssue({ code: "custom", path: ["photo"], message: pl.errors.imageRequired });
    } else if (photo.size > MAX_PHOTO_BYTES) {
      ctx.addIssue({ code: "custom", path: ["photo"], message: pl.errors.imageSize });
    } else if (!isAcceptedPhoto(photo)) {
      ctx.addIssue({ code: "custom", path: ["photo"], message: pl.errors.imageFormat });
    }
  }));

export function CaseForm({
  initialDraft,
  serverFieldErrors,
  serviceError = false,
  onSubmit,
  onRetry,
  disabled = false,
}: CaseFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<Draft>({
    defaultValues: initialDraft,
    mode: "onTouched",
    shouldFocusError: false,
    resolver: zodResolver(clientSchema) as Resolver<Draft>,
  });
  const caseType = useWatch({ control, name: "caseType" });
  const photo = useWatch({ control, name: "photo" });
  const description = useWatch({ control, name: "description" }) ?? "";
  const [previewUrl, setPreviewUrl] = useState<string>();
  const formDisabled = disabled || submitted;
  const descriptionLabel = caseType === "return"
    ? pl.form.labels.returnDescription
    : pl.form.labels.complaintDescription;
  const descriptionPlaceholder = caseType === "return"
    ? pl.form.placeholders.returnDescription
    : pl.form.placeholders.complaintDescription;
  const descriptionHint = errors.description?.message;
  const photoError = errors.photo?.message;

  useEffect(() => {
    if (!photo || typeof URL.createObjectURL !== "function") return;
    const url = URL.createObjectURL(photo);
    // This effect mirrors the browser's object-URL lifecycle into the rendered preview.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!serverFieldErrors) return;
    const orderedErrors = FIELD_ORDER.flatMap((field) => {
      const message = serverFieldErrors[field];
      return message ? [{ field, message }] : [];
    });
    if (!orderedErrors.length) return;
    // A server rejection reopens a form that had already been locked after submission.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmitted(false);
    orderedErrors.forEach(({ field, message }, index) => {
      setError(field, { type: "server", message }, { shouldFocus: index === 0 });
    });
    const firstError = orderedErrors[0];
    if (firstError) focusField(firstError.field);
  }, [serverFieldErrors, setError]);

  const summaryVisible = isSubmitted && Object.keys(errors).length > 0;

  const submitDraft = (draft: Draft) => {
    setSubmitted(true);
    onSubmit(draft);
  };

  const focusFirstInvalid = (invalidFields: Record<string, unknown>) => {
    const firstInvalid = FIELD_ORDER.find((field) => invalidFields[field] !== undefined);
    if (firstInvalid) focusField(firstInvalid);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    clearErrors("photo");
    setValue("photo", undefined, { shouldDirty: true, shouldTouch: true });
    if (file.size > MAX_PHOTO_BYTES) {
      setError("photo", { type: "validate", message: pl.errors.imageSize });
      return;
    }
    if (!isAcceptedPhoto(file)) {
      setError("photo", { type: "validate", message: pl.errors.imageFormat });
      return;
    }
    setValue("photo", file, { shouldDirty: true, shouldTouch: true, shouldValidate: isSubmitted });
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8">
      {serviceError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{pl.errors.analysisBanner}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                if (onRetry) void handleSubmit((draft) => onRetry(draft))();
              }}
            >
              {pl.form.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(submitDraft, focusFirstInvalid)}
        className="space-y-6"
      >
        <fieldset data-field="caseType" disabled={formDisabled} className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-medium">{pl.form.labels.caseType}</legend>
          <Controller
            name="caseType"
            control={control}
            render={({ field }) => (
              <RadioGroup
                name={field.name}
                value={field.value ?? ""}
                onValueChange={(value) => field.onChange(value as CaseType)}
                disabled={formDisabled}
                aria-label={pl.form.labels.caseType}
                aria-required={true}
                aria-invalid={Boolean(errors.caseType)}
                aria-describedby={errors.caseType ? idForError("caseType") : undefined}
                className="grid gap-3 sm:grid-cols-2"
              >
                {(["complaint", "return"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 focus-within:ring-2 focus-within:ring-ring disabled:cursor-not-allowed"
                  >
                    <RadioGroupItem
                      ref={type === "complaint" ? field.ref : undefined}
                      value={type}
                      aria-label={pl.form.caseType[type].label}
                      aria-required={true}
                      aria-describedby={`${type}-subtitle`}
                      aria-invalid={Boolean(errors.caseType)}
                    />
                    <span className="grid gap-1">
                      <span className="font-semibold text-primary">{pl.form.caseType[type].label}</span>
                      <span id={`${type}-subtitle`} className="text-sm text-muted-foreground">{pl.form.caseType[type].subtitle}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
          <FieldError id={idForError("caseType")} message={errors.caseType?.message} />
        </fieldset>

        <div data-field="category" className="space-y-2">
          <Label htmlFor="category-trigger">{pl.form.labels.category}</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                name={field.name}
                value={field.value ?? ""}
                onValueChange={(value) => field.onChange(value as CategoryId)}
                disabled={formDisabled}
              >
                <SelectTrigger
                  id="category-trigger"
                  ref={field.ref}
                  aria-required={true}
                  aria-invalid={Boolean(errors.category)}
                  aria-describedby={errors.category ? idForError("category") : undefined}
                  className="w-full"
                >
                  <SelectValue placeholder={pl.form.labels.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id={idForError("category")} message={errors.category?.message} />
        </div>

        <div data-field="model" className="space-y-2">
          <Label htmlFor="model">{pl.form.labels.model}</Label>
          <Input
            id="model"
            placeholder={pl.form.placeholders.model}
            disabled={formDisabled}
            required
            aria-invalid={Boolean(errors.model)}
            aria-describedby={errors.model ? idForError("model") : undefined}
            {...register("model")}
          />
          <FieldError id={idForError("model")} message={errors.model?.message} />
        </div>

        <div data-field="purchaseDate" className="space-y-2">
          <Label htmlFor="purchaseDate">{pl.form.labels.purchaseDate}</Label>
          <Input
            id="purchaseDate"
            type="date"
            max={todayInWarsaw()}
            disabled={formDisabled}
            required
            aria-invalid={Boolean(errors.purchaseDate)}
            aria-describedby={errors.purchaseDate ? idForError("purchaseDate") : undefined}
            {...register("purchaseDate")}
          />
          <FieldError id={idForError("purchaseDate")} message={errors.purchaseDate?.message} />
        </div>

        <fieldset data-field="channel" disabled={formDisabled} className="min-w-0 space-y-2">
          <legend className="text-sm font-medium">{pl.form.labels.channel}</legend>
          <Controller
            name="channel"
            control={control}
            render={({ field }) => (
              <RadioGroup
                ref={field.ref}
                name={field.name}
                value={field.value ?? ""}
                onValueChange={(value) => field.onChange(value as Channel)}
                disabled={formDisabled}
                aria-label={pl.form.labels.channel}
                aria-required={true}
                aria-invalid={Boolean(errors.channel)}
                aria-describedby={errors.channel ? idForError("channel") : undefined}
                className="flex flex-wrap gap-5"
              >
                {(["online", "store"] as const).map((channel) => (
                  <label key={channel} className="flex cursor-pointer items-center gap-2">
                    <RadioGroupItem
                      value={channel}
                      aria-label={pl.form.channel[channel]}
                      aria-required={true}
                      aria-invalid={Boolean(errors.channel)}
                      aria-describedby={errors.channel ? idForError("channel") : undefined}
                    />
                    <span>{pl.form.channel[channel]}</span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
          <FieldError id={idForError("channel")} message={errors.channel?.message} />
        </fieldset>

        <div data-field="description" className="space-y-2">
          <Label htmlFor="description">
            {descriptionLabel}{" "}
            {caseType === "return" ? <span>{pl.form.optional}</span> : <span>{pl.form.labels.requiredMarker}</span>}
          </Label>
          <Textarea
            id="description"
            rows={5}
            placeholder={descriptionPlaceholder}
            disabled={formDisabled}
            required={caseType === "complaint"}
            aria-required={caseType === "complaint"}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={[
              "description-count",
              descriptionHint ? idForError("description") : undefined,
            ].filter(Boolean).join(" ")}
            {...register("description")}
          />
          <div className="flex justify-end text-sm text-muted-foreground">
            <span id="description-count">{description.length} / 2000</span>
          </div>
          <FieldError id={idForError("description")} message={descriptionHint} />
        </div>

        <Controller
          name="photo"
          control={control}
          render={({ field }) => (
            <div data-field="photo" className="space-y-2">
              <Label htmlFor="photo-input">{pl.form.labels.photo}</Label>
              {caseType && (
                <p className="text-sm text-muted-foreground">
                  {caseType === "complaint" ? pl.form.hints.complaintImage : pl.form.hints.returnImage}
                </p>
              )}
                <button
                  type="button"
                  ref={field.ref}
                  data-drop-zone
                  disabled={formDisabled}
                  aria-describedby={errors.photo ? idForError("photo") : undefined}
                  data-invalid={Boolean(errors.photo) || undefined}
                  onClick={() => {
                    if (!formDisabled) document.getElementById("photo-input")?.click();
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files[0]);
                }}
                className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 p-5 text-center font-inherit outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 data-invalid:border-destructive"
              >
                {photo && previewUrl && (
                  <Image src={previewUrl} alt={photo.name} width={320} height={180} unoptimized className="max-h-36 max-w-full rounded-md object-contain" />
                )}
                {photo && (
                  <>
                    <span className="font-medium">{photo.name}</span>
                    <span className="text-sm text-muted-foreground">{formatFileSize(photo.size)}</span>
                  </>
                )}
                <span>{pl.form.labels.dropzone}</span>
                <span className="inline-flex h-10 items-center rounded-[22px] border border-accent bg-card px-5 font-bold text-primary">
                  {pl.form.chooseImage}
                </span>
              </button>
              <Input
                id="photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-required={true}
                aria-invalid={Boolean(errors.photo)}
                aria-describedby={errors.photo ? idForError("photo") : undefined}
                className="sr-only"
                tabIndex={-1}
                disabled={formDisabled}
                onChange={(event) => {
                  handleFile(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              {photo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formDisabled}
                  onClick={() => {
                    setValue("photo", undefined, { shouldDirty: true, shouldTouch: true });
                    clearErrors("photo");
                    if (isSubmitted) setError("photo", { type: "required", message: pl.errors.imageRequired });
                  }}
                >
                  {pl.form.removeImage}
                </Button>
              )}
              <FieldError id={idForError("photo")} message={photoError} />
            </div>
          )}
        />

        {summaryVisible && <p role="alert" className="text-sm font-medium text-destructive">{pl.form.summary}</p>}
        <Button type="submit" disabled={formDisabled} className="w-full sm:w-auto">
          {pl.form.submit}
        </Button>
      </form>
    </div>
  );
}
