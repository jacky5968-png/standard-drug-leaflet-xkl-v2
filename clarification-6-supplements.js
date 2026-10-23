// 第26版：6案續核，只將有時／鮮少與未載數值頻率清楚區分。
const records=[{"license":"衛署藥製字第001154號","name":"炎達益膠囊","english":"INDOY CAPSULES","strength":"每粒含:Indomethacin 25mg","version":"3","date":"2024-08-15","source_sha256":"34779ec1d1c0501c95ee0d193b66f1b45f00dbb1d5b37a8273ca6c0be6743549","question_ids":["common-23"],"answer_text":"常見發生率：仿單未明確記載。第8節記載初期有時可能頭暈或頭痛，未提供數值發生率；第10.2節僅以「鮮少」描述造血、肝及腎臟機能的不良反應，不據此推定無風險或腎功能免調量。","evidence":[{"section_id":"s28","no":"8","title":"副作用/不良反應","quote":"初期使用，有時可能發生頭暈或頭痛，但如開始服用較低劑量治療，即可減少此種副作用之發生。","start":8,"end":51},{"section_id":"s35","no":"10.2","title":"藥效藥理特性","quote":"本品對造血機能、肝及腎臟機能鮮少有不良反應，更無荷爾蒙樣之副作用，是故可廣泛應用及長期服用。","start":86,"end":132}],"issue":"原摘要用未必代表常見且列出減量敘述，未清楚指出資料缺口；改明示第8節無數值頻率，只保留相關反應及第10.2質性用詞，不制定減量或常見分級。","review_id":"REVIEW606-0002","pharmacist_approved":false,"original_case":true,"kind":"明示頻率缺漏並精簡摘要"}];
export function clarification6Supplement(p,t,base){
 const r=records.find(r=>r.license===p.license&&r.question_ids.includes(t.id));
 if(!r||base.reviewer||r.source_sha256!==p.source_sha256||r.strength!==p.strength||r.version!==p.version||r.date!==p.date)return base;
 for(const e of r.evidence){const s=p.sections.find(s=>s.id===e.section_id);if(!s||s.no!==e.no||s.title!==e.title||s.text.slice(e.start,e.end)!==e.quote)return base;}
 return {...base,answer_text:r.answer_text,evidence:r.evidence,evidence_section_id:r.evidence.map(e=>e.section_id),evidence_quote:r.evidence.map(e=>e.quote),note:'',clarification_6_supplement:true,clarification_6_review_id:r.review_id,clarification_6_issue:r.issue};
}
