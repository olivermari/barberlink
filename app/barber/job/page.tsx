import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon, MessageSquareIcon, PhoneIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { nowMs, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { NextStepButton } from "@/components/barber/booking-action-buttons";
import { JobMap } from "@/components/barber/job-map-lazy";
import { JobSteps } from "@/components/barber/job-steps";
import { BookingChat } from "@/components/chat/booking-chat";
import { Photo } from "@/components/customer/ui";

const JOB_STATUSES = ["accepted", "on_the_way", "in_service"];

const HAIRLINE_ICON =
  "flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-[#e0d9ca]";

// Barber UI B4, the phone's "Current job": the map with Navigate over it,
// the customer, where the job is in its steps, the chat, and the one action
// that moves it on. Completing a cash job settles it (0018), so the
// confirmation on Complete is the cash check.
export default async function CurrentJobPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();
  const serverNow = nowMs();

  const [{ data: barber }, { data: job }] = await Promise.all([
    supabase.from("barber_profiles").select("current_lat, current_lng").eq("id", user.id).single(),
    supabase
      .from("bookings")
      .select(
        "id, status, address_text, address_lat, address_lng, price, platform_fee, customer_id, payment_method, accepted_at, on_the_way_at, in_service_at",
      )
      .eq("barber_id", user.id)
      .in("status", JOB_STATUSES)
      .order("requested_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!job) redirect("/barber");

  const { data: customer } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, phone")
    .eq("id", job.customer_id)
    .single();

  const position =
    barber?.current_lat != null && barber?.current_lng != null
      ? { lat: barber.current_lat, lng: barber.current_lng }
      : null;
  const name = customer?.full_name ?? "Customer";
  const method = PAYMENT_METHOD_LABEL[job.payment_method ?? ""] ?? "Payment";
  const cashCommission = job.payment_method === "cod" ? Number(job.platform_fee) : null;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${job.address_lat},${job.address_lng}`;

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col bg-white lg:my-6 lg:rounded-[18px] lg:border lg:border-line lg:shadow-[0_24px_60px_rgba(22,19,15,0.07)]">
      <div className="flex items-center gap-3 px-[18px] pt-4 pb-3.5">
        <Link href="/barber" aria-label="Back to jobs" className="-ml-1.5 flex size-8 items-center justify-center">
          <ChevronLeftIcon className="size-6" aria-hidden />
        </Link>
        <h1 className="flex-1 text-[17px] font-bold">Current job</h1>
        <span className="rounded-[20px] bg-[#16130f] px-[9px] py-[5px] text-[11px] font-bold text-white">
          {method.toUpperCase()} ₱{job.price}
        </span>
      </div>

      <div className="relative isolate h-[210px] shrink-0 overflow-hidden border-y border-line bg-photo">
        <JobMap customer={{ lat: job.address_lat, lng: job.address_lng }} barber={position} />
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-x-3.5 bottom-3 z-[500] rounded-[10px] border border-[#e0d9ca] bg-white p-3 text-center text-sm font-bold shadow-[0_6px_18px_rgba(22,19,15,0.1)]"
        >
          Navigate — open in Maps
        </a>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-3.5 pb-4">
        <div className="flex items-center gap-3 rounded-[14px] border border-line p-[13px]">
          <Photo src={customer?.avatar_url} name={name} className="size-11" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[15px] font-bold">{name}</span>
            <span className="text-[12.5px] text-faint">{job.address_text}</span>
          </div>
          {customer?.phone && (
            <a href={`tel:${customer.phone}`} aria-label={`Call ${name}`} className={HAIRLINE_ICON}>
              <PhoneIcon className="size-4" aria-hidden />
            </a>
          )}
          <a href="#chat" aria-label={`Message ${name}`} className={HAIRLINE_ICON}>
            <MessageSquareIcon className="size-4" aria-hidden />
          </a>
        </div>

        <JobSteps job={job} serverNow={serverNow} />

        <BookingChat
          bookingId={job.id}
          currentUserId={user.id}
          otherPartyLabel={name}
          otherPartyAvatarUrl={customer?.avatar_url}
          variant="barber-job"
          className="min-h-[180px] flex-1"
        />

        <NextStepButton
          bookingId={job.id}
          barberId={user.id}
          status={job.status}
          cashCommission={cashCommission}
          className="h-auto rounded-[11px] p-4 text-base"
        />
      </div>
    </div>
  );
}
