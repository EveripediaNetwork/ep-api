import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

interface Sel {
  path?: string
  nested?: boolean
}

const getSelectedFields = (
  selectionSet: any,
  isNested: boolean,
): Array<string | { name: string; selections: any }> => {
  if (!selectionSet) {
    return []
  }

  return selectionSet.selections.flatMap((selection: any) => {
    if (selection.selectionSet) {
      if (isNested) {
        return {
          name: selection.name.value,
          selections: getSelectedFields(selection.selectionSet, true),
        }
      }
      return selection.name.value
    }
    return selection.name.value
  })
}

const SelectedFields = createParamDecorator(
  (sel: Sel | undefined, context: ExecutionContext) => {
    const gqlContext = GqlExecutionContext.create(context)
    const info = gqlContext.getInfo()

    if (!sel) {
      const selectedFields = info.fieldNodes[0].selectionSet.selections.map(
        (selection: { name: { value: string } }) => selection.name.value,
      )
      return selectedFields
    }
    if (sel.nested && sel.path) {
      const data = info.fieldNodes[0].selectionSet.selections.findIndex(
        (obj: any) => obj.name.value === sel.path,
      )
      const onlySel = info.fieldNodes[0].selectionSet.selections[data]
      return info.fieldNodes[0].selectionSet.selections.map(
        (selection: any) => {
          if (selection.name.value === sel.path) {
            return {
              name: onlySel.name.value,
              selections: getSelectedFields(onlySel.selectionSet, true),
            }
          }
          return selection.name.value
        },
      )
    }
    if (sel.nested && !sel.path) {
      return info.fieldNodes[0].selectionSet.selections.map(
        (selection: any) => {
          if (selection.selectionSet) {
            if (sel.nested) {
              return {
                name: selection.name.value,
                selections: getSelectedFields(selection.selectionSet, true),
              }
            }
            return selection.name.value
          }
          return selection.name.value
        },
      )
    }
    return []
  },
)

export default SelectedFields
