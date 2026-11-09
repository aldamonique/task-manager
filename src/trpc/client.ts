import "client-only";

import {
  createTRPCClient,
  httpBatchLink,
} from "@trpc/client";

import type { AppRouter } from "@/server/trpc/root";

// A shared typed client keeps every browser call aligned with the server router.
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});
