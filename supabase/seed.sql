-- AlphaResearch Seed Data
-- 50 US + 20 UK stocks for initial watchlist

INSERT INTO watchlist (ticker, company_name, market, exchange, sector, theme) VALUES
-- US AI INFRASTRUCTURE
('NVDA', 'NVIDIA Corporation', 'US', 'NASDAQ', 'Semiconductors', 'AI Infrastructure'),
('AMD', 'Advanced Micro Devices', 'US', 'NASDAQ', 'Semiconductors', 'AI Infrastructure'),
('AVGO', 'Broadcom Inc.', 'US', 'NASDAQ', 'Semiconductors', 'AI Infrastructure'),
('MRVL', 'Marvell Technology', 'US', 'NASDAQ', 'Semiconductors', 'AI Infrastructure'),
('ARM', 'Arm Holdings', 'US', 'NASDAQ', 'Semiconductors', 'AI Infrastructure'),
('TSM', 'Taiwan Semiconductor', 'US', 'NYSE', 'Semiconductors', 'AI Infrastructure'),
('ANET', 'Arista Networks', 'US', 'NYSE', 'Networking', 'AI Infrastructure'),
('SMCI', 'Super Micro Computer', 'US', 'NASDAQ', 'Data Centre', 'AI Infrastructure'),
('VRT', 'Vertiv Holdings', 'US', 'NYSE', 'Data Centre Cooling', 'AI Infrastructure'),
('EQIX', 'Equinix Inc.', 'US', 'NASDAQ', 'Data Centre REIT', 'AI Infrastructure'),
('DLR', 'Digital Realty Trust', 'US', 'NYSE', 'Data Centre REIT', 'AI Infrastructure'),
('LRCX', 'Lam Research', 'US', 'NASDAQ', 'Semiconductors', 'AI Infrastructure'),
('KLAC', 'KLA Corporation', 'US', 'NASDAQ', 'Semiconductors', 'AI Infrastructure'),
('AMAT', 'Applied Materials', 'US', 'NASDAQ', 'Semiconductors', 'AI Infrastructure'),
-- US MEGA CAP TECH
('MSFT', 'Microsoft Corporation', 'US', 'NASDAQ', 'Software', 'AI Infrastructure'),
('GOOGL', 'Alphabet Inc.', 'US', 'NASDAQ', 'Internet', 'AI Infrastructure'),
('META', 'Meta Platforms', 'US', 'NASDAQ', 'Social Media', 'AI Infrastructure'),
('AMZN', 'Amazon.com Inc.', 'US', 'NASDAQ', 'E-Commerce / Cloud', 'AI Infrastructure'),
('ORCL', 'Oracle Corporation', 'US', 'NYSE', 'Software', 'AI Infrastructure'),
('CRM', 'Salesforce Inc.', 'US', 'NYSE', 'Software', 'AI Infrastructure'),
-- US ENERGY & POWER
('CEG', 'Constellation Energy', 'US', 'NASDAQ', 'Nuclear Energy', 'Energy'),
('VST', 'Vistra Corp.', 'US', 'NYSE', 'Power Generation', 'Energy'),
('ETN', 'Eaton Corporation', 'US', 'NYSE', 'Power Management', 'Energy'),
('PWR', 'Quanta Services', 'US', 'NYSE', 'Grid Infrastructure', 'Energy'),
('FSLR', 'First Solar', 'US', 'NASDAQ', 'Solar Energy', 'Energy'),
-- US DEFENCE
('LMT', 'Lockheed Martin', 'US', 'NYSE', 'Defence', 'Defence'),
('RTX', 'RTX Corporation', 'US', 'NYSE', 'Defence', 'Defence'),
('NOC', 'Northrop Grumman', 'US', 'NYSE', 'Defence', 'Defence'),
('GD', 'General Dynamics', 'US', 'NYSE', 'Defence', 'Defence'),
('HII', 'HII Inc.', 'US', 'NYSE', 'Defence', 'Defence'),
-- US HEALTHCARE
('LLY', 'Eli Lilly', 'US', 'NYSE', 'Pharmaceuticals', 'Healthcare'),
('NVO', 'Novo Nordisk', 'US', 'NYSE', 'Pharmaceuticals', 'Healthcare'),
('ISRG', 'Intuitive Surgical', 'US', 'NASDAQ', 'Medical Devices', 'Healthcare'),
('VEEV', 'Veeva Systems', 'US', 'NYSE', 'Healthcare Software', 'Healthcare'),
('DXCM', 'DexCom Inc.', 'US', 'NASDAQ', 'Medical Devices', 'Healthcare'),
-- US FINANCIALS
('GS', 'Goldman Sachs', 'US', 'NYSE', 'Investment Banking', 'Financials'),
('MS', 'Morgan Stanley', 'US', 'NYSE', 'Investment Banking', 'Financials'),
('V', 'Visa Inc.', 'US', 'NYSE', 'Payments', 'Financials'),
('MA', 'Mastercard', 'US', 'NYSE', 'Payments', 'Financials'),
('COIN', 'Coinbase Global', 'US', 'NASDAQ', 'Crypto Exchange', 'Financials'),
-- US INDUSTRIALS
('GE', 'GE Aerospace', 'US', 'NYSE', 'Aerospace Engines', 'Industrials'),
('CAT', 'Caterpillar Inc.', 'US', 'NYSE', 'Heavy Equipment', 'Industrials'),
('DE', 'Deere & Company', 'US', 'NYSE', 'Agricultural Equipment', 'Industrials'),
('URI', 'United Rentals', 'US', 'NYSE', 'Equipment Rental', 'Industrials'),
('CARR', 'Carrier Global', 'US', 'NYSE', 'HVAC / Cooling', 'Industrials'),
-- US CONSUMER
('TSLA', 'Tesla Inc.', 'US', 'NASDAQ', 'EV / Energy', 'Consumer'),
('SBUX', 'Starbucks', 'US', 'NASDAQ', 'Consumer Staples', 'Consumer'),
('LULU', 'Lululemon Athletica', 'US', 'NASDAQ', 'Apparel', 'Consumer'),
('CRWD', 'CrowdStrike Holdings', 'US', 'NASDAQ', 'Cybersecurity', 'Technology'),
('SNOW', 'Snowflake Inc.', 'US', 'NYSE', 'Cloud Data', 'Technology'),
-- UK DEFENCE & AEROSPACE
('BA.L', 'BAE Systems', 'UK', 'LSE', 'Defence', 'UK Defence'),
('RR.L', 'Rolls-Royce Holdings', 'UK', 'LSE', 'Aerospace', 'UK Defence'),
('CHG.L', 'Chemring Group', 'UK', 'LSE', 'Defence', 'UK Defence'),
('MGGT.L', 'Meggitt PLC', 'UK', 'LSE', 'Defence', 'UK Defence'),
-- UK FINANCIALS
('HSBA.L', 'HSBC Holdings', 'UK', 'LSE', 'Banking', 'UK Financials'),
('BARC.L', 'Barclays PLC', 'UK', 'LSE', 'Banking', 'UK Financials'),
('LLOY.L', 'Lloyds Banking Group', 'UK', 'LSE', 'Banking', 'UK Financials'),
('STAN.L', 'Standard Chartered', 'UK', 'LSE', 'Banking', 'UK Financials'),
('AV.L', 'Aviva PLC', 'UK', 'LSE', 'Insurance', 'UK Financials'),
-- UK ENERGY
('NG.L', 'National Grid', 'UK', 'LSE', 'Utilities', 'UK Energy'),
('SSE.L', 'SSE PLC', 'UK', 'LSE', 'Utilities', 'UK Energy'),
('DRAX.L', 'Drax Group', 'UK', 'LSE', 'Power Generation', 'UK Energy'),
-- UK TECH & GROWTH
('SAGE.L', 'Sage Group', 'UK', 'LSE', 'Software', 'UK Technology'),
('AUTO.L', 'Auto Trader Group', 'UK', 'LSE', 'Digital Marketplace', 'UK Technology'),
('EXPN.L', 'Experian PLC', 'UK', 'LSE', 'Data Analytics', 'UK Technology'),
('MNDI.L', 'Mondi PLC', 'UK', 'LSE', 'Packaging', 'UK Industrials'),
('IMB.L', 'Imperial Brands', 'UK', 'LSE', 'Consumer Staples', 'UK Consumer'),
('ULVR.L', 'Unilever PLC', 'UK', 'LSE', 'Consumer Staples', 'UK Consumer'),
('DGE.L', 'Diageo PLC', 'UK', 'LSE', 'Consumer Staples', 'UK Consumer')
ON CONFLICT (ticker) DO NOTHING;
