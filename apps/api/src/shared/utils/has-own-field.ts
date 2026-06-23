export function hasOwnField<TData extends object>(
  data: TData,
  field: keyof TData,
) {
  return Object.prototype.hasOwnProperty.call(data, field);
}
