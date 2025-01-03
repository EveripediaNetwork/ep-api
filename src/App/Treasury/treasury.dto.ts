export const todayMidnightDate = new Date(new Date().setHours(0, 0, 0, 0))

export const oneYearAgo = 1658275200 // 2022 July 20

export const dateOnly = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return `${year}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`
}

export const firstLevelNodeProcess = () =>
  Number(process.env.pm_id) === 0 || !process.env.pm_id
