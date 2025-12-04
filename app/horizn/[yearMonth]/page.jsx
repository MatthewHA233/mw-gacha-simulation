'use client'

import HoriznPage from '@/views/HoriznPage'

export default function HoriznYearMonthPage({ params }) {
  const { yearMonth } = params

  return <HoriznPage yearMonth={yearMonth} />
}
