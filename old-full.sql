PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE `feed_hashtags` (
	`feed_id` integer NOT NULL,
	`hashtag_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hashtag_id`) REFERENCES `hashtags`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,17,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,18,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,19,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,20,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,21,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,22,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,23,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,24,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(3,25,1787729641,1787729641);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,1,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,5,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,6,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,7,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,8,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,9,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,10,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,11,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,12,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,13,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,14,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,15,1787748468,1787748468);
INSERT INTO "feed_hashtags" ("feed_id","hashtag_id","created_at","updated_at") VALUES(2,16,1787748468,1787748468);
CREATE TABLE `feeds` (
    `id` integer PRIMARY KEY NOT NULL,
    `alias` text,
    `title` text,
    `content` text NOT NULL,
    `summary` text DEFAULT '' NOT NULL,
    `listed` integer DEFAULT 1 NOT NULL,
    `draft` integer DEFAULT 1 NOT NULL,
    `top` integer DEFAULT 0 NOT NULL,
    `uid` integer NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    `updated_at` integer DEFAULT (unixepoch()) NOT NULL, `ai_summary` text DEFAULT '' NOT NULL, `ai_summary_status` text DEFAULT 'idle' NOT NULL, `ai_summary_error` text DEFAULT '' NOT NULL,
    FOREIGN KEY (`uid`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "feeds" ("id","alias","title","content","summary","listed","draft","top","uid","created_at","updated_at","ai_summary","ai_summary_status","ai_summary_error") VALUES(1,'about','关于',replace(replace('## 这是什么网站\r\n\r\n**aistock.fyi** 关注 **AI 产业链与相关标的**：从算力硬件、服务器与网络，到光模块、芯片与公司基本面，用可读的笔记把链路拆清楚。\r\n\r\n这里不是即时行情站，也不提供投资建议，而是偏 **研究与结构化整理**——把「概念 → 器件 → 公司 → 产品」放进同一套知识框架里。\r\n\r\n## 你能看到什么\r\n\r\n- **文章**：阶段趋势、财报与业务拆解、产业链跟踪\r\n- **知识树**：按 AI 服务器、GPU、光模块等节点浏览，并关联标签与文章\r\n- **标签**：如 NVIDIA、H200 等，用于串联同一主题下的内容\r\n\r\n## 内容原则\r\n\r\n1. **尽量可验证**：重要判断尽量对应公开信息与逻辑，而不是口号  \r\n2. **结构优先**：先讲清处在哪一段产业链，再谈公司与产品  \r\n3. **持续修正**：产业变化快，文中观点会随新信息更新或勘误  \r\n\r\n## 免责声明\r\n\r\n本站所有内容仅供学习与研究参考，**不构成任何投资建议**。市场有风险，决策请独立判断，并自行承担相应结果。\r\n\r\n## 联系\r\n\r\n若有纠错、补充材料或合作意向，可通过站点留言或邮件admin#aistock.fyi（把#改成@）与我联系。\r\n\r\n---\r\n\r\n*站点仍在建设中，知识树与文章会逐步充实。*','\r',char(13)),'\n',char(10)),'',1,0,1,1,1787572813,1787572813,'','idle','');
INSERT INTO "feeds" ("id","alias","title","content","summary","listed","draft","top","uid","created_at","updated_at","ai_summary","ai_summary_status","ai_summary_error") VALUES(2,'','2026年AI服务器全景：涨价潮来袭，英伟达Vera Rubin与Blackwell引领“AI工厂”时代',replace(replace('\r\n\r\n### 一、最新热点速览（2026年8月）\r\n\r\n1. **英伟达AI服务器涨价15%+**  \r\n   多家供应链与媒体确认：2027年初交付的 Grace Blackwell 与 Vera Rubin 系统将涨价超过15%，部分GB300/VR200机架涨幅约17%。  \r\n   主因是HBM（高带宽内存）与服务器内存成本飙升。以一套价值约700万美元的Vera Rubin NVL72机架计算，涨价后可能达到800万美元。一座1GW规模的AI数据中心仅此一项就可能额外增加约50亿美元成本。  \r\n   成本传导路径清晰：**内存涨价 → AI服务器涨价 → 云算力涨价 → 模型API与订阅费上涨**。\r\n\r\n2. **台湾起诉非法出口AI服务器到中国**  \r\n   台湾检方起诉9人（含英伟达与Supermicro相关人员），指控非法出口74台高端英伟达AI服务器到中国，另有56台被拦截。地缘政治对供应链的影响持续升级。\r\n\r\n3. **竞争格局加速分化**  \r\n   - AMD Helios（搭载MI455X）已全量产，OpenAI与Anthropic明确采用。  \r\n   - Cerebras推出CS-4服务器，主打推理加速。  \r\n   - 国产超节点（华为昇腾、阿里云、壁仞等）在WAIC集中亮相。\r\n\r\n---\r\n\r\n### 二、市场数据一览（表格）\r\n\r\n<div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 1em;">\r\n  <table class="table" style="font-size:12.5px;line-height:1.35;width:max-content;min-width:100%;border-collapse:collapse;">\r\n    <thead>\r\n      <tr>\r\n        <th style="padding:6px 10px;text-align:left;white-space:nowrap;">指标</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">2025年</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">2026年预测</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">同比增长</th>\r\n        <th style="padding:6px 10px;text-align:left;white-space:nowrap;">来源</th>\r\n      </tr>\r\n    </thead>\r\n    <tbody>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">全球AI服务器出货量</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">约280万台</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">~30.5%–31%</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">TrendForce</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">AI服务器占整体服务器价值</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">超74%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">TrendForce</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">全球AI基础设施规模</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">约4970亿美元</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">IDC</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">九大CSP资本开支</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">超8867亿美元</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">~90%</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">TrendForce</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">高端AI芯片液冷渗透率</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">41%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">65%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">TrendForce</td>\r\n      </tr>\r\n    </tbody>\r\n  </table>\r\n</div>\r\n<p style="font-size:12px;opacity:.75;margin:.25em 0 0;">\r\n  注：CSP = 云服务提供商（Google、Amazon、Meta、Microsoft、Oracle、字节、腾讯、阿里、百度）\r\n</p>\r\n\r\n---\r\n\r\n### 三、主流AI服务器平台对比\r\n\r\n<div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 1em;">\r\n  <table class="table" style="font-size:12.5px;line-height:1.35;width:max-content;min-width:100%;border-collapse:collapse;">\r\n    <thead>\r\n      <tr>\r\n        <th style="padding:6px 10px;text-align:left;white-space:nowrap;">平台</th>\r\n        <th style="padding:6px 10px;text-align:left;white-space:nowrap;">核心芯片</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">单机柜GPU数量</th>\r\n        <th style="padding:6px 10px;text-align:left;white-space:nowrap;">亮点</th>\r\n        <th style="padding:6px 10px;text-align:left;white-space:nowrap;">当前状态</th>\r\n        <th style="padding:6px 10px;text-align:left;white-space:nowrap;">主要客户</th>\r\n      </tr>\r\n    </thead>\r\n    <tbody>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">NVIDIA GB200 / GB300 NVL72</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">Blackwell B200 / Ultra</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">72</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">液冷、NVLink高带宽、FP4性能强</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">大规模部署中</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">Microsoft、CoreWeave、Google、Oracle</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">NVIDIA Vera Rubin NVL72</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">Rubin</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">72</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">推理吞吐最高提升30倍/瓦，HBM4</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">2026下半年量产加速</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">OpenAI、CoreWeave等</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">AMD Helios</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">MI455X + Venice CPU</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">机架级</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">与OpenAI深度合作，ROCm生态</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">全量产，即将出货</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">OpenAI、Anthropic</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">Cerebras CS-4</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">WSE-3 Turbo</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">3颗大芯片/机架</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">推理速度优化，组件减少50%</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">2026 Q3可用</td>\r\n        <td style="padding:5px 10px;white-space:nowrap;">推理场景</td>\r\n      </tr>\r\n    </tbody>\r\n  </table>\r\n</div>\r\n\r\n![*NVIDIA GB200 NVL72 机架示意（液冷设计）*](https://www.nvidia.com/content/dam/en-zz/Solutions/data-center/gb200-superchip/gb-nvl72-og.jpg)\r\n\r\n\r\n![*NVIDIA Vera Rubin NVL72 性能对比（官方数据）*](https://developer-blogs.nvidia.com/wp-content/uploads/2026/01/Figure-3-new-png.webp)\r\n\r\n\r\n![*AMD Helios 机架实拍*](https://www.amd.com/content/dam/amd/en/images/illustrations/blog/custom-thumbnails/helios/3888300-helios.jpg)\r\n\r\n---\r\n\r\n### 四、三大核心趋势\r\n\r\n1. **从“单卡”到“机架级超节点”**  \r\n   现在真正的竞争单位已不是单GPU，而是72卡甚至更多的整机柜（NVL72、Helios）。NVLink / 光互连成为关键。\r\n\r\n2. **液冷成为刚需**  \r\n   高端AI芯片液冷渗透率从2025年的41%飙升至2026年的65%。功率密度与散热直接决定数据中心建设成本与落地速度。\r\n\r\n3. **ASIC与国产方案加速**  \r\n   Google TPU、AWS Trainium、国内超节点份额持续提升。TrendForce预计ASIC AI服务器占比将从2025年的约21%升至2026年的25%。\r\n\r\n---\r\n\r\n### 五、总结与展望\r\n\r\n2026年下半年到2027年，AI服务器将进入“量价齐升 + 技术换代”双重阶段。英伟达仍主导高端市场，但AMD、Cerebras与国产超节点正在快速追赶。对投资者与从业者来说，重点关注三点：\r\n\r\n1. 内存（HBM）成本能否缓解；  \r\n2. 液冷与电力基础设施的落地速度；  \r\n3. 地缘政治对供应链的实际冲击。\r\n\r\nAI服务器已经从“服务器”变成真正的“AI工厂”。下一阶段，谁能同时解决**算力密度、功耗效率与交付速度**，谁就能在这场军备竞赛中占据优势。\r\n','\r',char(13)),'\n',char(10)),'2026年8月，AI服务器市场再迎重磅动态：英伟达旗舰系统将涨价15%以上、台湾起诉非法出口案、AMD Helios全面量产、液冷与超节点成为标配。TrendForce最新预测显示，2026年全球AI服务器出货量同比增长近31%。本文将基于最新X动态、行业报告与公开数据，带你快速理清当前格局。',1,0,0,1,1787630616,1787748468,'','idle','');
INSERT INTO "feeds" ("id","alias","title","content","summary","listed","draft","top","uid","created_at","updated_at","ai_summary","ai_summary_status","ai_summary_error") VALUES(3,'','利润翻倍，库存也在堆：中国大陆光模块半年报全景',replace(replace('\r\n2026年8月下旬，大陆主要光模块厂商半年报基本出齐。数字很亮：中际旭创上半年净利136.5亿元，同比增2.4倍；新易盛净利75.3亿元，接近翻倍。驱动逻辑也很清楚——北美云厂商加码AI基建，800G继续放量，1.6T进入规模出货。\r\n\r\n但把资产负债表摊开，另一面同样醒目：扩产、锁料、发货账期拉长，存货和应收账款同步膨胀。利润记在报表上，现金却有相当一部分压在仓库和客户账上。\r\n\r\n这是一轮真实的需求扩张，也是一轮用营运资本换交付能力的扩张。\r\n\r\nAI数据中心里，光模块是机柜之间的“高速公路”。800G仍是主力，1.6T正在爬坡。\r\n\r\n\r\n\r\n## 一张表看完：营收、利润，以及堆在仓库里的货\r\n\r\n下表为2026年上半年主要数据。存货、应收账款均为期末账面价值，变动相对2025年末。\r\n\r\n<p style="font-size:13px;opacity:.85;margin:0 0 .5em;">\r\n  单位：亿元人民币 · 2026 年上半年（可左右滑动查看）\r\n</p>\r\n\r\n<div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 1em;">\r\n  <table class="table" style="font-size:12.5px;line-height:1.35;width:max-content;min-width:100%;border-collapse:collapse;">\r\n    <thead>\r\n      <tr>\r\n        <th style="padding:6px 10px;text-align:left;white-space:nowrap;">公司</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">营收</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">营收同比</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">净利</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">净利同比</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">存货</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">存货较年初</th>\r\n        <th style="padding:6px 10px;text-align:right;white-space:nowrap;">应收账款</th>\r\n      </tr>\r\n    </thead>\r\n    <tbody>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">中际旭创</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">417.78</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+182.5%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">136.51</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+241.7%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">198.26</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+56.3%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">150.01</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">新易盛</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">209.10</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+100.3%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">75.29</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+91.0%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">116.55</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+61.1%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">75.48</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">光迅科技</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">66.10</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+26.1%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">5.82</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+56.3%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">90.70</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+57.8%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">13.46</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">天孚通信</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">28.28</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+15.2%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">12.04</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+33.9%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">9.29</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+103.3%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">14.52</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">剑桥科技</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">27.05</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+32.9%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">3.28</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+171.1%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">31.97</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+34.6%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">26.19</td>\r\n      </tr>\r\n      <tr>\r\n        <td style="padding:5px 10px;white-space:nowrap;">东山精密<sup style="font-size:10px;">*</sup></td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">277.98</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+64.0%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">29.57</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;">+290.1%</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n        <td style="padding:5px 10px;text-align:right;white-space:nowrap;opacity:.5;">—</td>\r\n      </tr>\r\n    </tbody>\r\n  </table>\r\n</div>\r\n\r\n<p style="font-size:12px;opacity:.75;margin:.25em 0 0;">\r\n  * 东山精密为公司整体口径；光模块（含索尔思）收入约 53.51 亿元，毛利率约 39.3%。存货/应收未按光模块单独披露，故记为「—」。\r\n</p>\r\n\r\n“易中天”（中际旭创、新易盛、天孚通信）合计归母净利约224亿元，经营现金流合计仅约44亿元；三家应收加存货超过560亿元。光迅科技存货已占到总资产近四成，经营现金流为负12.4亿元。\r\n\r\n## 中际旭创：规模断层领先，1.6T成为增长核\r\n\r\n中际旭创仍是全球光互连收入第一梯队的“体量担当”。光通信收发模块收入413.55亿元，毛利率46.59%，同比提升6.63个百分点。海外收入396.15亿元，占比接近95%。\r\n\r\n产销同步翻倍：上半年产能、产量、销量分别约2215万、1886万、1899万只。公司称1.6T硅光模块已进入规模放量，出货逐季攀升；在手订单覆盖2026全年，部分排到2027年。Q2单季净利约79.2亿元，环比再增38%。\r\n\r\n代价是营运资本：存货198亿元，应收150亿元（较年初增逾一倍），货币资金从约110亿元降到64亿元，经营现金流18亿元、同比下降44%。公司拟每10股派现12元。\r\n\r\n可插拔光模块仍是当前交付主力形态。800G常见QSFP-DD与OSFP两种封装，1.6T则进一步走向更高密度与散热要求。\r\n\r\n\r\n\r\n\r\n## 新易盛：增速紧随其后，1.6T二季度明显抬头\r\n\r\n新易盛光互联收入208.83亿元，毛利率48.46%。产能扩至2836万只，产量1091万只、销量1119万只。800G仍是出货主力，1.6T二季度出货较一季度显著增加，硅光占比继续提升。测算Q2净利约47.5亿元，环比约七成。\r\n\r\n存货116.55亿元、应收75.48亿元。更醒目的是预付款项从约1700万元升至8.7亿元，半年放大五十多倍，指向上游芯片、激光器等长交期物料的提前锁定。单季毛利率环比略回落，市场普遍将其解读为1.6T爬坡期良率与成本尚未完全摊薄。\r\n\r\n## 光迅、天孚、剑桥：不同位置上的同一轮景气\r\n\r\n**光迅科技**更像“电信底盘 + 数通加速”。营收66.1亿元、净利5.82亿元。传输类产品22.83亿元（+50.5%），数据与接入类43.1亿元（+16.0%）；海外收入22.74亿元（+73.8%），占比升至34%。存货90.7亿元，公司解释为市场需求备货；同时计提了存货跌价。产品已覆盖400G/800G/1.6T，并布局LPO/LRO与OCS。\r\n\r\n**天孚通信**是器件与光引擎侧的“铲子”。营收只增15%，净利增34%，毛利率因无源器件放量升至约61%。无源光器件收入15.3亿元（+77.4%），毛利率71.9%；有源则受物料短缺拖累同比下滑。经营现金流10.0亿元，与利润最为匹配，但存货仍从4.6亿元翻到9.3亿元。\r\n\r\n**剑桥科技**体量较小，弹性不小：净利增171%。高速光模块订单与发货金额同比大增，800G已批量出货北美及亚太，1.6T完成认证、预计下半年放量，并推进ELSFP、XPO、NPO。存货32.0亿元，以原材料储备为主。\r\n\r\n**东山精密**借索尔思光电并表切入光模块，该业务上半年收入53.51亿元、毛利率39.3%，同时推进3.2T研发。它不是传统“纯光模块股”，但已是不可忽视的新进入者。\r\n\r\n大陆光模块产能仍在快速铺开。洁净车间、自动化产线和海外基地，是这轮半年报里“存货上升”的物理对应物。\r\n\r\n\r\n\r\n## 读半年报时，别只看利润增速\r\n\r\n这轮财报有三条几乎所有公司都在重复的主线。\r\n\r\n**第一，产品在换代。** 800G是现金流，1.6T是弹性。硅光渗透率提升有助于中长期成本和功耗，但量产初期往往先压低良率、抬高单位成本。XPO、NPO、CPO、OCS已出现在多家公司的演示或小批量叙事里，还不是当期收入主力。\r\n\r\n**第二，海外仍是利润中心。** 中际旭创、新易盛海外占比极高，直接绑定北美CSP资本开支。国内互联网厂商加码算力，正成为第二增长极，但价格与产品结构与北美不完全一样。\r\n\r\n**第三，利润和现金暂时分了家。** 扩产要买设备、锁DSP/EML/硅光芯片和激光器，发货要给云厂商账期。存货本身不一定是坏事——订单能见度到2026全年甚至2027年时，备料是交付承诺；风险在于迭代速度：若1.6T替代800G快于预期，或客户Capex节奏放缓，高库存就会变成跌价与周转压力。\r\n\r\n机柜内、机柜间的光纤密度还在上升。对模块厂来说，这意味着更长的物料清单，也意味着更重的营运资本。\r\n\r\n\r\n\r\n## 往下看什么\r\n\r\n需求侧，北美头部云厂商资本开支仍是行业总开关；1.6T认证与混插兼容门槛高，供给格局短期内不容易彻底打散。供给侧，要盯三件事：海外产能爬坡是否跟上关税与交付要求，上游物料是否从“预付抢货”回到正常周转，以及1.6T毛利率能否在下半年随良率回升。\r\n\r\n半年报给出的结论并不复杂：景气是真的，增长也是真的；只是这一轮增长，有相当一部分先以存货和应收的形式，停在了资产负债表上。\r\n\r\n*本文数据来自各公司2026年半年度报告及公开报道，不构成投资建议。*','\r',char(13)),'\n',char(10)),'',1,0,0,1,1787728171,1787729641,'','idle','');
CREATE TABLE `friends` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`desc` text,
	`avatar` text NOT NULL,
	`url` text NOT NULL,
	`uid` integer NOT NULL,
	`accepted` integer DEFAULT 0 NOT NULL,
	`health` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL, `sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "friends" ("id","name","desc","avatar","url","uid","accepted","health","created_at","updated_at","sort_order") VALUES(1,'Hi.LXC.ONE','LXC personal HUB','https://img.lxc.one/favicon.png','https://hi.lxc.one/',1,1,'',1787748873,1787748873,0);
CREATE TABLE `hashtags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(1,'NVIDIA',1787575387,1787575387);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(2,'H200',1787575387,1787575387);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(3,'AMD',1787575387,1787575387);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(4,'AI服务器',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(5,'Blackwell',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(6,'Vera Rubin',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(7,'GB200',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(8,'AMD Helios',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(9,'HBM',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(10,'液冷',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(11,'超节点',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(12,'GPU服务器',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(13,'数据中心',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(14,'AI基建',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(15,'CSP',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(16,'TrendForce',1787631426,1787631426);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(17,'光模块',1787728829,1787728829);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(18,'易中天',1787728829,1787728829);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(19,'中际旭创',1787728829,1787728829);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(20,'新易盛',1787728829,1787728829);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(21,'天孚通信',1787728829,1787728829);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(22,'光迅科技',1787728829,1787728829);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(23,'剑桥科技',1787728829,1787728829);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(24,'东山精密',1787728829,1787728829);
INSERT INTO "hashtags" ("id","name","created_at","updated_at") VALUES(25,'索尔思',1787728829,1787728829);
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`openid` text NOT NULL,
	`avatar` text,
	`permission` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
, `password` text);
INSERT INTO "users" ("id","username","openid","avatar","permission","created_at","updated_at","password") VALUES(1,'admin','admin','',1,1787572808,1787572808,'1a4335bb541a966fb6fba016308f719339416744c9367a50d7e059c8558888b4');
CREATE TABLE `visits` (
	`id` integer PRIMARY KEY NOT NULL,
	`feed_id` integer NOT NULL,
	`ip` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(1,1,'69.12.91.63',1787573032);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(2,1,'69.12.91.63',1787573453);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(3,1,'69.12.91.63',1787573566);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(4,1,'69.12.91.63',1787573633);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(5,1,'69.12.91.63',1787573690);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(6,1,'69.12.91.63',1787573700);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(7,1,'69.12.91.63',1787576124);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(8,1,'69.12.91.63',1787580374);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(9,1,'69.12.91.63',1787580950);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(10,1,'36.251.98.217',1787582344);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(11,1,'36.251.98.217',1787582353);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(12,1,'36.251.98.217',1787582495);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(13,1,'36.251.98.217',1787595660);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(14,1,'36.251.98.217',1787597510);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(15,1,'36.251.98.217',1787597546);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(16,1,'36.251.98.217',1787598507);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(17,1,'36.251.98.217',1787598518);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(18,1,'36.251.98.217',1787598539);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(19,1,'69.12.91.63',1787613076);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(20,1,'69.12.91.63',1787619123);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(21,1,'69.12.91.63',1787619175);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(22,1,'69.12.91.63',1787620653);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(23,1,'69.12.91.63',1787626801);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(24,1,'69.12.91.63',1787627564);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(25,1,'69.12.91.63',1787627615);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(26,1,'69.12.91.63',1787627650);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(27,1,'69.12.91.63',1787627655);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(28,1,'69.12.91.63',1787627728);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(29,1,'69.12.91.63',1787627817);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(30,1,'69.12.91.63',1787627872);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(31,1,'69.12.91.63',1787627935);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(32,1,'69.12.91.63',1787628987);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(33,1,'69.12.91.63',1787629643);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(34,1,'69.12.91.63',1787629708);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(35,2,'69.12.91.63',1787631430);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(36,2,'69.12.91.63',1787631498);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(37,2,'69.12.91.63',1787631501);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(38,2,'69.12.91.63',1787631524);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(39,2,'69.12.91.63',1787631609);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(40,2,'69.12.91.63',1787631979);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(41,1,'69.12.91.63',1787636196);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(42,2,'69.12.91.63',1787636449);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(43,1,'69.12.91.63',1787636549);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(44,1,'152.39.232.85',1787636934);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(45,2,'36.251.98.217',1787647280);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(46,2,'36.251.98.217',1787653133);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(47,2,'36.251.98.217',1787653137);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(48,2,'36.251.98.217',1787653145);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(49,1,'36.251.98.217',1787653356);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(50,1,'192.161.160.210',1787710043);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(51,1,'192.161.160.210',1787710050);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(52,2,'192.161.160.210',1787710122);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(53,2,'192.161.160.210',1787710124);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(54,1,'125.77.46.120',1787714167);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(55,1,'192.161.160.210',1787714514);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(56,1,'192.161.160.210',1787714516);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(57,1,'192.161.160.210',1787714521);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(58,2,'192.161.160.210',1787714525);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(59,2,'192.161.160.210',1787714528);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(60,1,'125.77.46.120',1787716449);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(61,1,'66.249.73.13',1787723388);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(62,1,'66.249.73.12',1787724807);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(63,3,'192.161.160.210',1787728838);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(64,3,'192.161.160.210',1787729158);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(65,3,'192.161.160.210',1787729649);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(66,3,'192.161.160.210',1787729686);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(67,3,'192.161.160.210',1787729701);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(68,3,'192.161.160.210',1787729781);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(69,1,'66.249.73.11',1787733927);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(70,3,'192.161.160.210',1787739010);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(71,3,'2408:844b:400:645a:29f7:dbc1:25b7:45a2',1787742969);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(72,1,'2408:844b:400:645a:29f7:dbc1:25b7:45a2',1787742987);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(73,2,'36.251.98.217',1787743675);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(74,3,'36.251.98.217',1787743710);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(75,2,'192.161.160.210',1787744408);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(76,2,'192.161.160.210',1787744423);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(77,3,'36.251.98.217',1787744993);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(78,3,'36.251.98.217',1787745023);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(79,1,'36.251.98.217',1787745030);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(80,1,'36.251.98.217',1787745035);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(81,1,'36.251.98.217',1787745189);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(82,1,'36.251.98.217',1787745196);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(83,1,'36.251.98.217',1787745713);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(84,1,'36.251.98.217',1787746129);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(85,1,'36.251.98.217',1787746134);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(86,3,'192.161.160.210',1787746466);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(87,1,'36.251.98.217',1787746493);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(88,1,'36.251.98.217',1787746549);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(89,3,'192.161.160.210',1787747884);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(90,3,'192.161.160.210',1787747917);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(91,1,'36.251.98.217',1787747945);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(92,3,'36.251.98.217',1787747966);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(93,3,'36.251.98.217',1787748064);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(94,2,'192.161.160.210',1787748125);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(95,3,'192.161.160.210',1787748133);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(96,3,'192.161.160.210',1787748136);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(97,3,'192.161.160.210',1787748276);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(98,2,'192.161.160.210',1787748283);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(99,2,'192.161.160.210',1787748285);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(100,2,'192.161.160.210',1787748373);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(101,3,'192.161.160.210',1787748376);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(102,3,'192.161.160.210',1787748378);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(103,3,'192.161.160.210',1787748441);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(104,2,'192.161.160.210',1787748446);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(105,2,'192.161.160.210',1787748474);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(106,2,'36.251.98.217',1787748493);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(107,3,'36.251.98.217',1787748521);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(108,3,'36.251.98.217',1787748528);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(109,3,'192.161.160.210',1787748659);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(110,2,'192.161.160.210',1787748667);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(111,1,'36.251.98.217',1787748934);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(112,1,'2408:844b:400:645a:29f7:dbc1:25b7:45a2',1787751979);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(113,1,'192.161.160.210',1787753698);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(114,3,'192.161.160.210',1787753710);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(115,1,'192.161.160.210',1787753733);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(116,3,'192.161.160.210',1787753737);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(117,1,'36.251.98.217',1787786370);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(118,1,'36.251.98.217',1787787187);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(119,1,'2408:844b:400:645a:29f7:dbc1:25b7:45a2',1787792315);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(120,1,'66.249.73.4',1787837016);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(121,1,'66.249.73.11',1787839200);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(122,1,'103.219.193.149',1787929027);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(123,1,'103.219.193.149',1787929075);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(124,3,'66.249.65.171',1788017640);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(125,2,'66.249.65.170',1788018567);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(126,1,'66.249.65.169',1788021242);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(127,3,'66.249.74.67',1788029760);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(128,3,'66.249.74.66',1788029961);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(129,1,'103.219.193.149',1788087762);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(130,1,'103.219.193.149',1788087767);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(131,1,'103.219.193.149',1788087883);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(132,2,'103.219.193.149',1788087889);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(133,2,'103.219.193.149',1788087892);
INSERT INTO "visits" ("id","feed_id","ip","created_at") VALUES(134,2,'103.219.193.149',1788096480);
CREATE TABLE `info` (
	`key` text NOT NULL,
	`value` text NOT NULL
);
INSERT INTO "info" ("key","value") VALUES('migration_version','13');
CREATE TABLE `moments` (
	`id` integer PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`uid` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `visit_stats` (
	`feed_id` integer PRIMARY KEY NOT NULL,
	`pv` integer DEFAULT 0 NOT NULL,
	`hll_data` text DEFAULT '' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "visit_stats" ("feed_id","pv","hll_data","updated_at") VALUES(1,74,'ApwCB0MBCUUBDoIBFjsCF5ACF/cBIUUDLO8DO4oBPVoBPucL',1788087882);
INSERT INTO "visit_stats" ("feed_id","pv","hll_data","updated_at") VALUES(2,30,'AykECUUBF5ACLO8DO4oB',1788096480);
INSERT INTO "visit_stats" ("feed_id","pv","hll_data","updated_at") VALUES(3,30,'CUUBDoIBF5ACIFEBJk8DNAED',1788029960);
CREATE TABLE `cache` (
	`id` integer PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`type` text DEFAULT 'cache' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(1,'cache.enabled','false','client.config',1787572729,1787753688);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(2,'friend_crontab','true','server.config',1787572801,1787753688);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(3,'counter.enabled','true','client.config',1787573031,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(4,'site.name','AI Stock | 智股','client.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(5,'site.description','聚焦 AI 产业链：公司基本面、阶段趋势与硬件环节拆解。','client.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(6,'site.avatar','https://img.aistock.fyi/images/aistock-avatar.jpg','client.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(7,'site.page_size','5','client.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(8,'theme.color','#0f766e','client.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(9,'header.behavior','reveal','client.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(10,'feed.layout','list','client.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(11,'ai_summary.enabled','false','server.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(12,'ai_summary.provider','openai','server.config',1787573404,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(13,'ai_summary.model','gpt-4o-mini','server.config',1787573405,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(14,'ai_summary.api_url','https://api.openai.com/v1','server.config',1787573405,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(15,'login.enabled','true','client.config',1787619305,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(16,'rss','false','client.config',1787619305,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(17,'footer','版权所有 | AI Stock 智股 | 自2026年','client.config',1787619529,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(18,'friend_apply_enable','true','client.config',1787748839,1787753689);
INSERT INTO "cache" ("id","key","value","type","created_at","updated_at") VALUES(19,'feed.card_variant','editorial','client.config',1787753689,1787753689);
CREATE TABLE IF NOT EXISTS "comments" (
	`id` integer PRIMARY KEY NOT NULL,
	`feed_id` integer NOT NULL,
	`user_id` integer,
	`content` text NOT NULL,
	`guest_name` text DEFAULT '',
	`guest_email` text DEFAULT '',
	`guest_website` text DEFAULT '',
	`approved` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `entities` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `slug` text NOT NULL,
    `name` text NOT NULL,
    `name_cn` text,
    `type` text NOT NULL,
    `description` text DEFAULT '' NOT NULL,
    `summary` text DEFAULT '' NOT NULL,
    `data` text DEFAULT '{}' NOT NULL,
    `parent_id` integer,
    `sort_order` integer DEFAULT 0 NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    `updated_at` integer DEFAULT (unixepoch()) NOT NULL
, enabled INTEGER NOT NULL DEFAULT 1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(1,'ai-server','AI Server','AI服务器','concept','AI 训练与推理服务器','','{}',NULL,100,1787575387,1787734605,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(2,'gpu','GPU','GPU','component','AI 加速卡 / 图形处理器','','{}',NULL,90,1787575387,1787575387,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(3,'cpu','CPU','CPU','component','中央处理器','','{}',NULL,80,1787575387,1787575387,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(4,'memory','HBM','HBM','component','高带宽内存','','{"aliases":["hbm","HBM"]}',NULL,70,1787575387,1787741015,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(5,'nvidia','NVIDIA','英伟达','company','AI 芯片龙头企业','','{}',NULL,60,1787575387,1787575387,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(6,'amd','AMD','超威半导体','company','CPU/GPU 厂商','','{}',NULL,50,1787575387,1787575387,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(7,'micron','Micron','美光','company','存储芯片厂商','','{}',NULL,40,1787575387,1787575387,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(8,'h100','H100','H100','product','NVIDIA Hopper 架构旗舰 GPU','','{}',NULL,30,1787575387,1787575387,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(10,'blackwell','Blackwell',NULL,'product','','','{}',NULL,10,1787633921,1787633921,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(11,'vera-rubin','Vera Rubin',NULL,'product','','','{}',NULL,10,1787633921,1787633921,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(12,'gb200','GB200',NULL,'product','GB200是由NVIDIA的Grace CPU+B200芯片组合成的底板的叫法，其中GB200又分为两种规格，一种是GB200 NVL2（2*CPU+*GPU，也叫Ariel），另外一种为GB200 Grace Blackwell Superchip(1*CPU+2*GPU，也叫Bianca板)','','{}',NULL,10,1787633921,1787740967,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(13,'amd-helios','AMD Helios',NULL,'company','','','{}',NULL,10,1787633922,1787633922,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(15,'液冷','液冷','液冷','component','','','{}',NULL,10,1787633922,1787633922,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(16,'超节点','超节点','超节点','concept','','','{}',NULL,10,1787633922,1787633922,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(17,'gpu服务器','GPU服务器','GPU服务器','component','','','{}',NULL,10,1787633923,1787633923,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(18,'数据中心','数据中心','数据中心','concept','','','{}',NULL,10,1787633923,1787633923,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(19,'ai基建','AI基建','AI基建','concept','','','{}',NULL,10,1787633923,1787633923,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(20,'csp','CSP',NULL,'concept','','','{}',NULL,10,1787633923,1787633923,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(21,'trendforce','TrendForce',NULL,'concept','','','{}',NULL,10,1787633924,1787633924,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(22,'光模块','光模块','光模块','concept','','','{}',NULL,10,1787728829,1787728829,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(23,'易中天','易中天','易中天','concept',replace('“易中天” 为 “中际旭创、新易盛、天孚通信”的总称\n\n','\n',char(10)),'','{}',NULL,10,1787728829,1787729993,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(24,'中际旭创','中际旭创','中际旭创','company','主营业务是高端光通信收发模块的研发、生产及销售。公司的主要产品是光通信收发模块、光组件、汽车光电子。','','{}',NULL,10,1787728829,1787739636,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(25,'新易盛','新易盛','新易盛','company','主营业务是全系列光通信应用的光模块的研发、生产和销售。公司的主要产品是光互联产品。','','{}',NULL,10,1787728830,1787739597,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(27,'光迅科技','光迅科技','光迅科技','company','是光电器件、模块研发及产业化全球先行者；专注于光通信领域近50年，具备光电子芯片、器件、模块及子系统产品的战略研发和规模量产能力。 ','光迅科技源于1976年成立的邮电部固体器件研究所，2001年改制，2009年登陆深圳证券交易所，成为国内首家上市的通信光电子器件公司，连续十九年入选“中国光器件与辅助设备及原材料最具竞争力企业10强（榜首）”“全球光器件最具竞争力企业10强”','{}',NULL,10,1787728830,1787739538,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(28,'剑桥科技','剑桥科技','剑桥科技','company','主营业务是电信、数通、企业网络与家庭网络领域通信连接的终端设备（包括电信宽带、无线网络与边缘计算）以及高速光模块产品的研发、生产与销售。公司的主要产品是高速光模块、电信宽带、无线网络、边缘计算。','','{}',NULL,10,1787728831,1787741118,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(29,'东山精密','东山精密','东山精密','company','苏州东山精密制造股份有限公司的主营业务是电子电路、光模块（含光芯片）、精密组件、光电显示模组的全球设计、生产和销售。公司的主要产品是电子电路、光模块（含光芯片）、精密组件、光电显示模组。','','{}',NULL,10,1787728831,1787739149,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(30,'索尔思','索尔思','索尔思','company','索尔思光电（Source Photonics）是一家光通信元器件供应商，专注于光芯片、光器件及光模块的设计、研发、生产与销售。总部位于美国加州，在中国成都、常州等地设有研发与生产基地 。其产品速率覆盖从10G到1.6T及以上','','{}',NULL,10,1787728831,1787739194,1);
INSERT INTO "entities" ("id","slug","name","name_cn","type","description","summary","data","parent_id","sort_order","created_at","updated_at","enabled") VALUES(32,'天孚通信','天孚通信','天孚通信','company','主营业务是以研发创新为驱动，依托高复用的技术平台与深度的产业链垂直整合能力，提供结合无源光器件、有源光器件和光模块代工服务的一站式光互连解决方案。公司的主要产品是光互连元器件。','','{"aliases":["天孚通信"]}',NULL,10,1787740367,1787741070,1);
CREATE TABLE `entity_relations` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `from_id` integer NOT NULL,
    `to_id` integer NOT NULL,
    `relation_type` text NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`from_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`to_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(1,1,2,'uses',1787575387);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(2,1,3,'uses',1787575387);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(3,1,4,'uses',1787575387);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(4,2,5,'supplier',1787575387);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(5,2,6,'supplier',1787575387);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(6,4,7,'supplier',1787575387);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(7,8,5,'product_of',1787575387);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(9,10,5,'product_of',1787633924);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(10,11,5,'product_of',1787633924);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(11,12,5,'product_of',1787633924);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(13,1,15,'uses',1787633924);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(14,1,16,'related',1787633924);
INSERT INTO "entity_relations" ("id","from_id","to_id","relation_type","created_at") VALUES(15,1,17,'uses',1787633925);
CREATE TABLE `feed_entities` (
    `feed_id` integer NOT NULL,
    `entity_id` integer NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,10,1787738728);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,11,1787738728);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,12,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,13,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,4,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,15,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,16,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,17,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,18,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,19,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,20,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,21,1787738729);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,22,1787738730);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,23,1787738730);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,24,1787738730);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,25,1787738730);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,27,1787738730);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,28,1787738731);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,29,1787738731);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,30,1787738731);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(2,2,1787740309);
INSERT INTO "feed_entities" ("feed_id","entity_id","created_at") VALUES(3,32,1787740367);
CREATE TABLE `entity_hashtags` (
    `entity_id` integer NOT NULL,
    `hashtag_id` integer NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`hashtag_id`) REFERENCES `hashtags`(`id`) ON UPDATE no action ON DELETE cascade
);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(2,3,1787575387);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(2,2,1787575387);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(2,1,1787575387);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(5,1,1787633920);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(1,4,1787633921);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(10,5,1787633921);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(11,6,1787633921);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(12,7,1787633921);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(13,8,1787633922);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(4,9,1787633922);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(15,10,1787633922);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(16,11,1787633922);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(17,12,1787633923);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(18,13,1787633923);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(19,14,1787633923);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(20,15,1787633923);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(21,16,1787633924);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(22,17,1787728829);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(23,18,1787728829);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(24,19,1787728830);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(25,20,1787728830);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(27,22,1787728830);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(28,23,1787728831);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(29,24,1787728831);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(30,25,1787728831);
INSERT INTO "entity_hashtags" ("entity_id","hashtag_id","created_at") VALUES(32,21,1787740367);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('entities',32);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('entity_relations',16);
CREATE UNIQUE INDEX `info_key_unique` ON `info` (`key`);
CREATE UNIQUE INDEX `cache_key_type_unique` ON `cache` (`key`,`type`);
CREATE INDEX `feeds_alias_idx` ON `feeds` (`alias`);
CREATE INDEX `feeds_visibility_order_idx` ON `feeds` (`draft`, `listed`, `top`, `created_at`, `updated_at`);
CREATE INDEX `feeds_uid_idx` ON `feeds` (`uid`);
CREATE INDEX `visits_feed_created_at_idx` ON `visits` (`feed_id`, `created_at`);
CREATE INDEX `friends_accepted_order_idx` ON `friends` (`accepted`, `sort_order`, `created_at`);
CREATE INDEX `users_openid_idx` ON `users` (`openid`);
CREATE INDEX `comments_feed_created_at_idx` ON `comments` (`feed_id`, `created_at`);
CREATE INDEX `hashtags_name_idx` ON `hashtags` (`name`);
CREATE INDEX `feed_hashtags_feed_hashtag_idx` ON `feed_hashtags` (`feed_id`, `hashtag_id`);
CREATE INDEX `feed_hashtags_hashtag_feed_idx` ON `feed_hashtags` (`hashtag_id`, `feed_id`);
CREATE INDEX `cache_type_key_idx` ON `cache` (`type`, `key`);
CREATE UNIQUE INDEX `entities_slug_unique` ON `entities` (`slug`);
CREATE INDEX `entities_slug_idx` ON `entities` (`slug`);
CREATE INDEX `entities_type_idx` ON `entities` (`type`);
CREATE INDEX `entities_parent_idx` ON `entities` (`parent_id`);
CREATE INDEX `entity_relations_from_idx` ON `entity_relations` (`from_id`);
CREATE INDEX `entity_relations_to_idx` ON `entity_relations` (`to_id`);
CREATE UNIQUE INDEX `entity_relations_unique` ON `entity_relations` (`from_id`,`to_id`,`relation_type`);
CREATE INDEX `feed_entities_feed_entity_idx` ON `feed_entities` (`feed_id`,`entity_id`);
CREATE INDEX `feed_entities_entity_feed_idx` ON `feed_entities` (`entity_id`,`feed_id`);
CREATE UNIQUE INDEX `feed_entities_pk` ON `feed_entities` (`feed_id`,`entity_id`);
CREATE INDEX `entity_hashtags_entity_hashtag_idx` ON `entity_hashtags` (`entity_id`,`hashtag_id`);
CREATE INDEX `entity_hashtags_hashtag_entity_idx` ON `entity_hashtags` (`hashtag_id`,`entity_id`);
CREATE UNIQUE INDEX `entity_hashtags_pk` ON `entity_hashtags` (`entity_id`,`hashtag_id`);
CREATE INDEX entities_enabled_idx ON entities(enabled);
