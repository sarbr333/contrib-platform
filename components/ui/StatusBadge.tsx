export function StatusBadge({ status }: { status: string }) {
  if (status === 'APPROVED') return <span className="badge-approved">已确认</span>
  if (status === 'REJECTED') return <span className="badge-rejected">已驳回</span>
  return <span className="badge-pending">待审核</span>
}
