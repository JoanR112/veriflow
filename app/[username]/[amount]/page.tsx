import { headers } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { VerificationFlow } from "@/components/verification-flow";
import { getAppConfigStatus } from "@/lib/config";
import { currencyFormatter, formatAmountFromPathSegment, titleFromUsername } from "@/lib/format";

type PageProps = {
  params: Promise<{
    username: string;
    amount: string;
  }>;
};

async function buildRequestUrl(username: string, amount: string) {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    return null;
  }

  return `${protocol}://${host}/${username}/${amount}`;
}

function getDeviceKind(userAgent: string | null) {
  if (!userAgent) {
    return "desktop" as const;
  }

  return /android|iphone|ipad|mobile/i.test(userAgent)
    ? ("mobile" as const)
    : ("desktop" as const);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const amount = formatAmountFromPathSegment(resolvedParams.amount);

  if (!amount) {
    return {};
  }

  return {
    title: `${titleFromUsername(resolvedParams.username)} · ${currencyFormatter.format(amount.value)} · Okpay`,
    description:
      "Route-based identity verification with QR handoff, real document uploads, and payout review.",
  };
}

export default async function VerificationRoute({ params }: PageProps) {
  const resolvedParams = await params;
  const amount = formatAmountFromPathSegment(resolvedParams.amount);

  if (!amount) {
    notFound();
  }

  const headerList = await headers();
  const requestUrl =
    (await buildRequestUrl(resolvedParams.username, resolvedParams.amount)) ??
    `https://example.vercel.app/${resolvedParams.username}/${resolvedParams.amount}`;
  const qrDataUrl = await QRCode.toDataURL(requestUrl, {
    width: 720,
    margin: 1,
    color: {
      dark: "#0b0b0f",
      light: "#f4f4f6",
    },
  });
  const config = getAppConfigStatus();

  return (
    <VerificationFlow
      username={resolvedParams.username}
      amountCents={amount.cents}
      amountLabel={currencyFormatter.format(amount.value)}
      requestUrl={requestUrl}
      qrDataUrl={qrDataUrl}
      initialDeviceKind={getDeviceKind(headerList.get("user-agent"))}
      verificationReady={config.requiredReady}
      requiredMissing={config.requiredMissing}
    />
  );
}
