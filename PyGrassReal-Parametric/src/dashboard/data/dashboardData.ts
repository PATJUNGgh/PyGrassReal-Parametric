export const DASHBOARD_UI = {
  title: { th: '3D-Edit', en: '3D-Edit' },
  subtitle: { 
    th: 'จัดการและแก้ไขโมเดล 3D แบบพาราเมตริกของคุณ สร้างโปรเจกต์ใหม่หรือทำงานต่อจากที่ค้างไว้', 
    en: 'Manage and edit your parametric 3D models. Create new workflows or continue where you left off.' 
  },
  refreshing: { th: 'กำลังรีเฟรชรายการ...', en: 'Refreshing workflow list...' },
  showingItems: (count: number) => ({
    th: `แสดง ${count} รายการในมุมมองปัจจุบัน`,
    en: `Showing ${count} item${count === 1 ? '' : 's'} in the current view.`
  }),
  upgradePlan: { th: 'อัปเกรดแพ็กเกจ', en: 'Upgrade plan' },
  checkingPlan: { th: 'กำลังตรวจสอบแพ็กเกจ...', en: 'Checking plan...' },
  freePlan: { th: 'แพ็กเกจฟรี', en: 'Free Plan' },
  activeSuffix: { th: 'ใช้งานอยู่', en: 'Active' },
  aiPowered: { th: 'ขับเคลื่อนด้วยระบบ AI', en: 'AI Powered Engine' },
  editedPrefix: { th: 'แก้ไขเมื่อ', en: 'Edited' },
  collapse: { th: 'ย่อหน้าต่าง', en: 'Collapse' },
};

export const TOOLBAR_UI = {
  searchPlaceholder: { th: 'ค้นหาเวิร์กโฟลว์', en: 'Search workflows' },
  filters: { th: 'ตัวกรอง', en: 'Filters' },
  sort: { th: 'เรียงตาม', en: 'Sort' },
  status: { th: 'สถานะ', en: 'Status' },
  owner: { th: 'เจ้าของ', en: 'Owner' },
  ownerPersonal: { th: 'ส่วนตัว', en: 'Personal' },
  ownerUnassigned: { th: 'ไม่ได้ระบุ', en: 'Unassigned' },
  sortOptions: {
    updated_desc: { th: 'แก้ไขล่าสุด', en: 'Updated (latest)' },
    created_desc: { th: 'สร้างล่าสุด', en: 'Created (latest)' },
    name_asc: { th: 'ชื่อ A-Z', en: 'Name A-Z' },
  },
  statusOptions: {
    all: { th: 'ทั้งหมด', en: 'All' },
    active: { th: 'เปิดใช้งาน', en: 'Active' },
    inactive: { th: 'ปิดใช้งาน', en: 'Inactive' },
  },
  ownerOptions: {
    mine: { th: 'งานของฉัน', en: 'My workflows' },
    all: { th: 'งานทั้งหมด', en: 'All owners' },
  }
};

export const MODAL_UI = {
  deleteTitle: { th: 'ลบเวิร์กโฟลว์', en: 'Delete workflow' },
  deleteConfirm: (name: string) => ({
    th: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${name}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
    en: `Delete "${name}"? This action cannot be undone.`
  }),
  createTitle: { th: 'สร้างเวิร์กโฟลว์ใหม่', en: 'Create workflow' },
  createSubtitle: { th: 'ตั้งชื่อให้ชัดเจน แล้วเริ่มสร้างสรรค์งานใน Editor', en: 'Set a clear name, then open it in the editor.' },
  workflowNameLabel: { th: 'ชื่อเวิร์กโฟลว์', en: 'Workflow name' },
  placeholder: { th: 'เช่น การออกแบบโครงสร้างใหม่', en: 'e.g. New structure design' },
  cancel: { th: 'ยกเลิก', en: 'Cancel' },
  delete: { th: 'ลบข้อมูล', en: 'Delete' },
  deleting: { th: 'กำลังลบ...', en: 'Deleting...' },
  create: { th: 'สร้างงาน', en: 'Create' },
  creating: { th: 'กำลังสร้าง...', en: 'Creating...' },
  save: { th: 'บันทึก', en: 'Save' },
  saving: { th: 'กำลังบันทึก...', en: 'Saving...' },
};

export const PAGINATION_UI = {
  total: { th: 'ทั้งหมด', en: 'Total' },
  page: { th: 'หน้า', en: 'Page' },
  of: { th: 'จาก', en: 'of' },
  perPage: { th: 'รายการต่อหน้า', en: 'Per page' },
  prev: { th: 'ก่อนหน้า', en: 'Previous' },
  next: { th: 'ถัดไป', en: 'Next' },
};

export const EMPTY_STATE_UI = {
  noWorkflows: { th: 'ยังไม่มีงานของคุณ', en: 'No workflows yet' },
  description: { th: 'สร้างเวิร์กโฟลว์แรกของคุณเพื่อเริ่มสร้างตรรกะแบบโหนด', en: 'Create your first workflow and start building node logic.' },
};

export const TOPBAR_UI = {
  closeSidebar: { th: 'ปิดแถบข้าง', en: 'Close sidebar' },
  openSidebar: { th: 'เปิดแถบข้าง', en: 'Open sidebar' },
  signOut: { th: 'ออกจากระบบ', en: 'Sign out' },
  moreActions: { th: 'การดำเนินการเพิ่มเติม', en: 'More actions' },
};

export const DASHBOARD_TOAST_UI = {
  successCreated: { th: 'สร้างเวิร์กโฟลว์สำเร็จ', en: 'Workflow created' },
  successUpdated: { th: 'อัปเดตเวิร์กโฟลว์สำเร็จ', en: 'Workflow updated' },
  successDuplicated: { th: 'ทำสำเนาเวิร์กโฟลว์สำเร็จ', en: 'Workflow duplicated' },
  successDeleted: { th: 'ลบเวิร์กโฟลว์สำเร็จ', en: 'Workflow deleted' },
};

export const WORKFLOW_CARD_UI = {
  editName: { th: 'แก้ไขชื่อ', en: 'Edit name' },
  duplicate: { th: 'ทำสำเนา', en: 'Duplicate' },
};

export const API_MANAGEMENT_UI = {
  title: { th: 'API Management', en: 'API Management' },
  subtitle: {
    th: 'จัดการ API keys, rate limits, billing และ subscription ของคุณในที่เดียว',
    en: 'Manage API keys, rate limits, billing, and subscription in one place.',
  },
  tabs: {
    apiKeys: { th: 'API Keys', en: 'API Keys' },
    rateLimits: { th: 'Rate Limits', en: 'Rate Limits' },
    billing: { th: 'Billing', en: 'Billing' },
    subscription: { th: 'Subscription', en: 'Subscription' },
  },
  common: {
    mockData: { th: 'ข้อมูลตัวอย่าง (Mock Data)', en: 'Mock data' },
    noData: { th: 'ไม่พบข้อมูล', en: 'No data available' },
    close: { th: 'ปิด', en: 'Close' },
    cancel: { th: 'ยกเลิก', en: 'Cancel' },
    create: { th: 'สร้าง', en: 'Create' },
    save: { th: 'บันทึก', en: 'Save' },
    copy: { th: 'คัดลอก', en: 'Copy' },
    copied: { th: 'คัดลอกแล้ว', en: 'Copied' },
    delete: { th: 'ลบ', en: 'Delete' },
  },
  apiKeys: {
    title: { th: 'จัดการ API Keys', en: 'API Key Management' },
    description: {
      th: 'สร้างและจัดการ API key สำหรับเชื่อมต่อบริการของระบบ',
      en: 'Create and manage API keys used to connect with platform services.',
    },
    tipsTitle: { th: 'คำแนะนำด้านความปลอดภัย', en: 'Security Tips' },
    tipsItems: [
      {
        th: 'ห้ามแชร์ API key กับบุคคลอื่นหรือโพสต์ในที่สาธารณะ',
        en: 'Never share your API keys publicly or with unauthorized people.',
      },
      {
        th: 'กำหนดชื่อ key ให้สื่อความหมายและลบ key ที่ไม่ได้ใช้งาน',
        en: 'Use descriptive names and remove keys you no longer use.',
      },
      {
        th: 'หมุนเวียน key เป็นระยะเพื่อลดความเสี่ยงด้านความปลอดภัย',
        en: 'Rotate keys periodically to reduce security risk.',
      },
    ],
    createButton: { th: 'Create', en: 'Create' },
    createModalTitle: { th: 'สร้าง API Key ใหม่', en: 'Create a new API key' },
    createModalNameLabel: { th: 'ชื่อ Key', en: 'Key name' },
    createModalNamePlaceholder: { th: 'เช่น Production Backend', en: 'e.g. Production Backend' },
    table: {
      name: { th: 'Name', en: 'Name' },
      keyId: { th: 'API Key ID', en: 'API Key ID' },
      apiKey: { th: 'API Key', en: 'API Key' },
      createdAt: { th: 'Creation time', en: 'Creation time' },
      lastUsed: { th: 'Last used', en: 'Last used' },
      operations: { th: 'Operations', en: 'Operations' },
    },
    empty: { th: 'ยังไม่มี API key', en: 'No API keys yet' },
  },
  rateLimits: {
    title: { th: 'Pricing และ Billing', en: 'Pricing and Billing' },
    infoBanner: {
      th: 'ตารางด้านล่างคือ public price card ของโมเดลปัจจุบัน และการหักเครดิตจริงจะยืนยันกลับมาใน response ผ่านฟิลด์ `pygrassreal.cost_usd` หลังคำขอสำเร็จ',
      en: 'The table below is the current public price card. The actual debit is echoed back in each successful response via `pygrassreal.cost_usd`.',
    },
    table: {
      model: { th: 'Model', en: 'Model' },
      input: { th: 'Input Price', en: 'Input Price' },
      output: { th: 'Output Price', en: 'Output Price' },
      context: { th: 'Context Window', en: 'Context Window' },
    },
    explanationTitle: { th: 'พฤติกรรมการหักเครดิต', en: 'Wallet billing behavior' },
    explanationBody: {
      th: 'API key หลายตัวที่เป็นของเจ้าของคนเดียวกันจะใช้เครดิตจาก wallet เดียวกันทั้งหมด ดังนั้นการแยก key ตาม environment ไม่ได้แยกยอดหักเครดิตโดยอัตโนมัติ',
      en: 'Multiple API keys under the same owner share one wallet. Separate keys by environment if you want, but billing still rolls up to the owner credit balance.',
    },
    explanationItems: [
      {
        th: 'ตรวจสอบ `pygrassreal.cost_usd` และ `pygrassreal.remaining_credit_usd` ใน response ทุกครั้งหากต้องการทำ usage reconciliation',
        en: 'Read `pygrassreal.cost_usd` and `pygrassreal.remaining_credit_usd` in each response if you need usage reconciliation.',
      },
      {
        th: '`402 insufficient_credits` หมายถึงยอดคงเหลือจริงใน wallet ไม่พอสำหรับการหักค่าบริการของคำขอนั้น',
        en: '`402 insufficient_credits` means the real wallet balance cannot cover the debit for that request.',
      },
      {
        th: 'หากหลายระบบใช้ owner account เดียวกัน ควร monitor wallet และ transaction history อย่างสม่ำเสมอ',
        en: 'If multiple services share the same owner account, monitor wallet balance and transaction history closely.',
      },
    ],
  },
  billing: {
    title: { th: 'Billing', en: 'Billing' },
    cashBalance: { th: 'Cash balance', en: 'Cash balance' },
    creditsBalance: { th: 'Credits balance', en: 'Credits balance' },
    addPaymentMethod: { th: 'Add a Payment Method', en: 'Add a Payment Method' },
    balanceAlertOff: { th: 'Balance Alert is OFF', en: 'Balance Alert is OFF' },
    subTabs: {
      overview: { th: 'Overview', en: 'Overview' },
      payment: { th: 'Payment', en: 'Payment' },
      billingHistory: { th: 'Billing History', en: 'Billing History' },
      orderSummary: { th: 'Order Summary', en: 'Order Summary' },
      rechargeHistory: { th: 'Recharge History', en: 'Recharge History' },
      invoice: { th: 'Invoice', en: 'Invoice' },
      preference: { th: 'Preference', en: 'Preference' },
    },
  },
  subscription: {
    title: { th: 'Subscription', en: 'Subscription' },
    glmPlan: { th: 'GLM Coding Plan', en: 'GLM Coding Plan' },
    userGuide: { th: 'User Guide', en: 'User Guide' },
    faq: { th: 'FAQ', en: 'FAQ' },
    subTabs: {
      subscription: { th: 'Subscription', en: 'Subscription' },
      usage: { th: 'Usage', en: 'Usage' },
    },
    emptyState: {
      th: "You don't have any subscription",
      en: "You don't have any subscription",
    },
    grabOne: { th: 'Go and grab one.', en: 'Go and grab one.' },
  },
};
