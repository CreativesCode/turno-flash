import { useAuth } from "@/contexts/auth-context";
import { serviceCategoryFormSchema } from "@/schemas";
import {
  ServiceCategoryService,
  type ServiceCategoryInput,
} from "@/services/service-categories.service";
import { ServiceCategory } from "@/types/appointments";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { serviceKeys } from "./useServices.query";

export const serviceCategoryKeys = {
  all: ["service_categories"] as const,
  list: (orgId: string) => [...serviceCategoryKeys.all, { orgId }] as const,
};

/** Categories of the current business, in their display order. */
export function useServiceCategories() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? "";

  const query = useQuery({
    queryKey: serviceCategoryKeys.list(orgId),
    queryFn: async () => {
      const result = await ServiceCategoryService.getAll(orgId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60,
  });

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

function parseInput(input: ServiceCategoryInput): ServiceCategoryInput {
  const result = serviceCategoryFormSchema
    .pick({ name: true, description: true })
    .safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0].message);
  return result.data;
}

/** Shared plumbing: org check, error → throw, refresh categories + services. */
function useCategoryMutation<V>(
  run: (vars: V, orgId: string) => Promise<{ success: boolean; error?: string }>
) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (vars: V) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }
      const result = await run(vars, profile.organization_id);
      if (!result.success) throw new Error(result.error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: serviceCategoryKeys.all });
      // Deleting a category leaves its services without one
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

export function useCreateServiceCategory() {
  return useCategoryMutation((input: ServiceCategoryInput, orgId) =>
    ServiceCategoryService.create(parseInput(input), orgId)
  );
}

export function useUpdateServiceCategory() {
  return useCategoryMutation(
    ({ id, input }: { id: string; input: ServiceCategoryInput }, orgId) =>
      ServiceCategoryService.update(id, parseInput(input), orgId)
  );
}

export function useDeleteServiceCategory() {
  return useCategoryMutation((id: string, orgId) =>
    ServiceCategoryService.delete(id, orgId)
  );
}

/** Takes the full list in its new order; the cache follows at once. */
export function useReorderServiceCategories() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const mutation = useCategoryMutation((ids: string[], orgId) =>
    ServiceCategoryService.reorder(ids, orgId)
  );

  return {
    ...mutation,
    mutate: (
      ids: string[],
      options?: Parameters<typeof mutation.mutate>[1]
    ) => {
      const key = serviceCategoryKeys.list(profile?.organization_id ?? "");
      queryClient.setQueryData(key, (old: ServiceCategory[] | undefined) =>
        old
          ? ids
              .map((id) => old.find((c) => c.id === id))
              .filter((c): c is ServiceCategory => !!c)
              .map((c, index) => ({ ...c, sort_order: index }))
          : old
      );
      mutation.mutate(ids, options);
    },
  };
}
