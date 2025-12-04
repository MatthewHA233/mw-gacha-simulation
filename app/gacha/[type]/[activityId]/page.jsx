'use client'

import { GachaPage } from '@/views/GachaPage'

export default function GachaPageRoute({ params }) {
  const { type, activityId } = params

  return <GachaPage type={type} activityId={activityId} />
}
