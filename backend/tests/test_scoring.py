from app.services.scoring_service import ScoringService

def test_check1_strong_stock():
    svc = ScoringService()
    data = {'revenue_growth': 0.25, 'fcf_ttm': 5e9, 'market_cap': 100e9,
             'net_margin': 0.20, 'current_ratio': 2.0, 'debt_to_equity': 0.5,
             'return_on_equity': 0.25, 'peg_ratio': 1.2, 'forward_pe': 25}
    passed, result = svc.check1_fundamentals(data)
    assert passed == True
    assert result['quality'] in ['HIGH', 'MEDIUM']

def test_check2_stage2():
    svc = ScoringService()
    data = {'current_price': 100, 'ma50': 90, 'ma200': 80,
             'rsi14': 60, 'week52_high': 110, 'week52_low': 70, 'currency': 'USD'}
    passed, result = svc.check2_technicals(data)
    assert passed == True
    assert 'Stage 2' in result['stage']

def test_check2_stage4_fail():
    svc = ScoringService()
    data = {'current_price': 60, 'ma50': 70, 'ma200': 90,
             'rsi14': 35, 'week52_high': 110, 'week52_low': 55, 'currency': 'USD'}
    passed, result = svc.check2_technicals(data)
    assert passed == False

def test_conviction_scoring():
    svc = ScoringService()
    c1 = {'quality': 'HIGH'}
    c2 = {'stage': 'Stage 2 Markup'}
    c3 = {'signal_count': 2}
    score = svc.calculate_conviction(c1, c2, c3)
    assert score >= 8
    assert score <= 10
