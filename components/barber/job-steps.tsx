import { CheckIcon } from "lucide-react";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/time-ago";

const STEPS = [
  { status: "accepted", label: "Accepted", at: "accepted_at" },
  { status: "on_the_way", label: "On the way", at: "on_the_way_at" },
  { status: "in_service", label: "In service", at: "in_service_at" },
] as const;

export type JobTimes = {
  status: string;
  accepted_at: string | null;
  on_the_way_at: string | null;
  in_service_at: string | null;
};

// B4's step list: finished steps are red ticks with the time they
// happened, the current one is a ringed number and reads "started 12 min
// ago", later ones wait greyed.
export function JobSteps({ job, serverNow }: { job: JobTimes; serverNow: number }) {
  const current = STEPS.findIndex((s) => s.status === job.status);

  return (
    <ol className="flex flex-col gap-[9px]">
      {STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        const at = job[step.at];
        return (
          <li
            key={step.status}
            aria-current={state === "current" ? "step" : undefined}
            className="flex items-center gap-2.5"
          >
            <span
              className={cn(
                "flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs",
                state === "done" && "bg-primary text-primary-foreground",
                state === "current" && "border-2 border-primary font-bold text-primary",
                state === "upcoming" && "border border-line-strong text-faint",
              )}
            >
              {state === "done" ? <CheckIcon className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                state === "current" ? "text-[15px] font-bold" : "text-sm text-faint",
              )}
            >
              {step.label}
              {state === "done" && at && ` · ${formatTime(at)}`}
              {state === "current" && at && (
                <>
                  {" · started "}
                  <TimeAgo iso={at} serverNowMs={serverNow} />
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
