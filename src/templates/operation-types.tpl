import { BasePayload, BaseSuccessResponse, ForbiddenError, NotFoundError, BaseError } from "@/api/api.types";
import { TFieldValidationError } from "@/types/shared.types";
{{ModelImport}}

{{ValidationErrorInterface}}

export interface {{ActionPascal}}Payload extends BasePayload<{
{{PayloadStructure}}
}> {}

export interface {{ActionPascal}}Response extends BaseSuccessResponse<{
{{ResponseStructure}}
}> {}

export type {{ActionPascal}}ErrorMap = {
{{ErrorMapStructure}}
};
