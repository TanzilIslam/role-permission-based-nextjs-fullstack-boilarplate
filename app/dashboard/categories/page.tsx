import { getCategoriesAction } from "@/app/actions/categories"
import { CreateCategoryDialog } from "@/components/dashboard/categories/create-category-dialog"
import { CategoryTable } from "@/components/dashboard/categories/category-table"

export default async function CategoriesPage() {
  const result = await getCategoriesAction()

  if (!result.success) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-destructive">{result.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage the list of categories.
          </p>
        </div>
        <CreateCategoryDialog />
      </div>

      <CategoryTable categories={result.data} />
    </div>
  )
}
