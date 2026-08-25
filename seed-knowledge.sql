-- ========== 1. 实体 ==========
INSERT INTO entities (slug, name, name_cn, type, description, summary, data, sort_order)
VALUES
('ai-server', 'AI Server', 'AI 服务器', 'concept', 'AI 训练与推理服务器', '', '{}', 100),
('gpu', 'GPU', 'GPU', 'component', 'AI 加速卡 / 图形处理器', '', '{}', 90),
('cpu', 'CPU', 'CPU', 'component', '中央处理器', '', '{}', 80),
('memory', 'Memory / HBM', '内存 / HBM', 'component', '高带宽内存', '', '{}', 70),
('nvidia', 'NVIDIA', '英伟达', 'company', 'AI 芯片龙头企业', '', '{}', 60),
('amd', 'AMD', '超威半导体', 'company', 'CPU/GPU 厂商', '', '{}', 50),
('micron', 'Micron', '美光', 'company', '存储芯片厂商', '', '{}', 40),
('h100', 'H100', 'H100', 'product', 'NVIDIA Hopper 架构旗舰 GPU', '', '{}', 30);

-- ========== 2. 实体关系（按 slug，不写死 id）==========
INSERT INTO entity_relations (from_id, to_id, relation_type)
SELECT a.id, b.id, 'uses' FROM entities a, entities b
WHERE a.slug='ai-server' AND b.slug='gpu';

INSERT INTO entity_relations (from_id, to_id, relation_type)
SELECT a.id, b.id, 'uses' FROM entities a, entities b
WHERE a.slug='ai-server' AND b.slug='cpu';

INSERT INTO entity_relations (from_id, to_id, relation_type)
SELECT a.id, b.id, 'uses' FROM entities a, entities b
WHERE a.slug='ai-server' AND b.slug='memory';

INSERT INTO entity_relations (from_id, to_id, relation_type)
SELECT a.id, b.id, 'supplier' FROM entities a, entities b
WHERE a.slug='gpu' AND b.slug='nvidia';

INSERT INTO entity_relations (from_id, to_id, relation_type)
SELECT a.id, b.id, 'supplier' FROM entities a, entities b
WHERE a.slug='gpu' AND b.slug='amd';

INSERT INTO entity_relations (from_id, to_id, relation_type)
SELECT a.id, b.id, 'supplier' FROM entities a, entities b
WHERE a.slug='memory' AND b.slug='micron';

INSERT INTO entity_relations (from_id, to_id, relation_type)
SELECT a.id, b.id, 'product_of' FROM entities a, entities b
WHERE a.slug='h100' AND b.slug='nvidia';

-- ========== 3. 标签 ==========
INSERT INTO hashtags (name) VALUES ('NVIDIA');
INSERT INTO hashtags (name) VALUES ('H200');
INSERT INTO hashtags (name) VALUES ('AMD');

-- ========== 4. gpu 挂标签 ==========
INSERT INTO entity_hashtags (entity_id, hashtag_id)
SELECT e.id, h.id FROM entities e, hashtags h
WHERE e.slug = 'gpu' AND h.name IN ('NVIDIA', 'H200', 'AMD');