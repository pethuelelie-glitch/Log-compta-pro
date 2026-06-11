import { createFileRoute } from "@tanstack/react-router";
import { TransactionPage } from "@/components/TransactionPage";

export const Route = createFileRoute("/_authenticated/depenses")({
  component: () => <TransactionPage kind="depenses" title="Dépenses" />,
  ssr: false,
});
