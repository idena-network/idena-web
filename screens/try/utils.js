export function GetNextUTCValidationDate() {
  const dt = new Date()
  dt.setDate(dt.getDate() + 1)
  dt.setUTCHours(13, 30, 0, 0)
  return dt
}
