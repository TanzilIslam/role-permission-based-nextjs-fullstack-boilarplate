import { getTypesAction } from "@/app/actions/types"
import { CreateTypeDialog } from "@/components/dashboard/types/create-type-dialog"
import { TypeTable } from "@/components/dashboard/types/type-table"

export default async function TypesPage() {
  const result = await getTypesAction()

  if (!result.success) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Types</h1>
        <p className="text-sm text-destructive">{result.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Types</h1>
          <p className="text-sm text-muted-foreground">
            Manage the list of types.
          </p>
        </div>
        <CreateTypeDialog />
      </div>

      <TypeTable types={result.data} />
    </div>
  )
}
