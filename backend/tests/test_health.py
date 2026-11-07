def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_events_sem_supabase_retorna_lista_vazia(client):
    r = client.get("/api/events")
    assert r.status_code == 200
    assert r.json() == []
