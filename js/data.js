/* ==========================================================
   data.js — mock data (documents, search results, chat replies)
   Edit this file to change what shows up in the prototype.
   ========================================================== */

/* Dashboard chart: 14-day activity */
const SYNAPSE_CHART = {
  days: ['M','T','W','T','F','S','S','M','T','W','T','F','S','S'],
  values: [42, 68, 53, 88, 71, 30, 22, 55, 79, 92, 76, 108, 64, 38]
};

/* Document library */
const SYNAPSE_DOCS = [
  { name:'Q2_Financial_Report.pdf',     type:'pdf',  size:'2.4 MB', pages:38,  date:'2 min ago',   tags:['finance','earnings','Q2-2026'], status:'ready' },
  { name:'Vendor_Agreement_v3.docx',    type:'docx', size:'412 KB', pages:12,  date:'1 hour ago',  tags:['legal','contract'],             status:'ready' },
  { name:'Research_Survey_2026.pdf',    type:'pdf',  size:'5.8 MB', pages:64,  date:'3 hours ago', tags:['research','ML'],                status:'ready' },
  { name:'Sales_Pipeline_2026Q2.xlsx',  type:'xlsx', size:'182 KB', pages:8,   date:'5 hours ago', tags:['sales','pipeline'],             status:'ready' },
  { name:'Product_Roadmap.pptx',        type:'pptx', size:'3.1 MB', pages:24,  date:'Yesterday',   tags:['product'],                      status:'ready' },
  { name:'GDPR_Compliance_Memo.docx',   type:'docx', size:'88 KB',  pages:6,   date:'Yesterday',   tags:['legal','GDPR'],                 status:'ready' },
  { name:'Lecture_08_Transformers.pdf', type:'pdf',  size:'1.2 MB', pages:22,  date:'2 days ago',  tags:['lecture','CS-501'],             status:'ready' },
  { name:'Whitepaper_AI_Safety.pdf',    type:'pdf',  size:'2.0 MB', pages:18,  date:'2 days ago',  tags:['research','safety'],            status:'processing' },
  { name:'Strategy_Workshop_Notes.txt', type:'txt',  size:'18 KB',  pages:1,   date:'3 days ago',  tags:['strategy'],                     status:'ready' },
  { name:'Site_Plan_Render.png',        type:'img',  size:'820 KB', pages:1,   date:'4 days ago',  tags:['design','OCR'],                 status:'ready' },
  { name:'Customer_Interview_07.docx',  type:'docx', size:'42 KB',  pages:4,   date:'5 days ago',  tags:['research','user'],              status:'ready' },
  { name:'Annual_Report_2025.pdf',      type:'pdf',  size:'9.2 MB', pages:120, date:'1 week ago',  tags:['finance','annual'],             status:'ready' }
];

/* File-extension → icon-class mapping used during upload */
const SYNAPSE_TYPE_MAP = {
  pdf:'pdf', docx:'docx', doc:'docx',
  xlsx:'xlsx', xls:'xlsx',
  pptx:'pptx', ppt:'pptx',
  png:'img', jpg:'img', jpeg:'img',
  txt:'txt', md:'txt'
};

/* Tag color cycling */
const SYNAPSE_TAG_COLORS = ['', 'cyan', 'pink', 'green'];

/* Sample semantic-search results */
const SYNAPSE_SEARCH_RESULTS = [
  {
    type:'pdf',  title:'Q2_Financial_Report.pdf',
    score:'97%',
    snippet:`The agreement with <mark>Acme Corp</mark> includes an indemnification ceiling of <mark>$2,500,000</mark> for any breach of confidentiality, with carve-outs for IP infringement which are uncapped. Standard mutual indemnification applies for third-party claims.`,
    page:'p. 14, §6.2',
    section:'Material Contracts'
  },
  {
    type:'docx', title:'Vendor_Agreement_v3.docx',
    score:'94%',
    snippet:`Each Party shall <mark>indemnify</mark>, defend and hold harmless the other Party from and against any and all losses exceeding <mark>$50,000</mark> per occurrence arising out of or relating to a third-party claim.`,
    page:'p. 7, §11.1',
    section:'Indemnification'
  },
  {
    type:'pdf',  title:'Annual_Report_2025.pdf',
    score:'89%',
    snippet:`The Company maintains contractual <mark>indemnification</mark> with all major vendors. The aggregate exposure across these obligations is bounded at <mark>$15M</mark> as of December 31, 2025.`,
    page:'p. 88',
    section:'Notes to Financial Statements'
  },
  {
    type:'docx', title:'GDPR_Compliance_Memo.docx',
    score:'81%',
    snippet:`Cross-border data transfer obligations require contractual indemnification of EUR 100,000 minimum, with thresholds rising to <mark>$500,000</mark> for restricted-category personal data.`,
    page:'p. 3',
    section:'Vendor Contracts'
  },
  {
    type:'pdf',  title:'Whitepaper_AI_Safety.pdf',
    score:'74%',
    snippet:`Model providers should accept <mark>indemnification</mark> liability for output-driven harm above commercially reasonable <mark>$ thresholds</mark>, balanced against the catastrophic-risk exclusion clauses common to the SaaS sector.`,
    page:'p. 11',
    section:'Liability framework'
  }
];

/* Canned chat replies — cycled in order */
const SYNAPSE_CHAT_REPLIES = [
  {
    text: `Looking at <strong>§6 Payment Terms</strong>, invoices are <strong>net-45</strong>, with a <strong>1.5%/month late fee</strong>. Notably, the contract has <em>no annual price-cap clause</em>, which means the vendor could increase fees by any amount on renewal — that's a clause worth negotiating.`,
    cites: [
      { num:1, title:'Vendor_Agreement_v3.docx · §6.1 Payment',   ref:'Page 5 · "Customer shall pay invoices within forty-five (45) days…"' },
      { num:2, title:'Vendor_Agreement_v3.docx · §6.3 Late Fees', ref:'Page 5 · "a late fee of one and one-half percent (1.5%) per month…"' }
    ]
  },
  {
    text: `I scanned the SLA section. The contract guarantees <strong>99.5% uptime</strong>, with <strong>service credits capped at 10%</strong> of monthly fees. There's <em>no provision for chronic outage termination</em>, which is an industry-standard customer protection that's missing here.`,
    cites: [
      { num:1, title:'Vendor_Agreement_v3.docx · §8 SLA', ref:'Page 6 · "Provider commits to ninety-nine and one-half percent (99.5%)…"' }
    ]
  },
  {
    text: `Three risks stand out: (1) the <strong>$50K early-exit fee</strong> in year one, (2) <strong>12-month post-termination data retention</strong> potentially conflicting with GDPR right-to-erasure, and (3) the <strong>auto-renewal clause requires 90-day notice</strong> — easy to miss.`,
    cites: [
      { num:1, title:'Vendor_Agreement_v3.docx · §12.4', ref:'Page 9 · "early-exit fee of US$50,000 shall apply…"' },
      { num:2, title:'Vendor_Agreement_v3.docx · §14',   ref:'Page 10 · "Provider shall retain Customer Data for twelve (12) months…"' },
      { num:3, title:'Vendor_Agreement_v3.docx · §13.2', ref:'Page 9 · "automatic renewal unless ninety (90) days prior notice…"' }
    ]
  }
];
