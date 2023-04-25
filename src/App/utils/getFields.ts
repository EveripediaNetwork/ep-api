import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

export const SelectedFields = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const gqlContext = GqlExecutionContext.create(context)
    const info = gqlContext.getInfo()
    const selectedFields = info.fieldNodes[0].selectionSet.selections.map(
      (selection: { name: { value: string } }) => selection.name.value,
    )
    return selectedFields
  },
)

export default SelectedFields
