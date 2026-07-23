# FlowDesk API — geliştirme kısayolları
# Kullanım: make <hedef>   ·   Komut listesi: make help

.DEFAULT_GOAL := help
.PHONY: help start stop restart build rebuild logs logs-db shell db-shell \
        migration-generate migration-run migration-revert seed \
        test test-watch test-cov test-e2e lint format \
        clean reset ps prod-up prod-down prod-logs prod-migrate

# ---------- yardım ----------

help: ## Komut listesini göster
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ---------- günlük ----------

start: ## Projeyi ayağa kaldır (arka planda) + logları izle
	docker compose up -d
	docker compose logs -f app

up: ## Ayağa kaldır (ön planda, Ctrl+C ile durur)
	docker compose up

stop: ## Durdur (volume korunur, veri gitmez)
	docker compose down

restart: ## Yeniden başlat
	docker compose restart app

ps: ## Çalışan container'ları listele
	docker compose ps

logs: ## App loglarını canlı izle
	docker compose logs -f app

logs-db: ## Postgres loglarını canlı izle
	docker compose logs -f postgres

# ---------- build ----------

build: ## İmajı yeniden inşa et (package.json değiştiyse)
	docker compose build

rebuild: ## Sıfırdan inşa et (cache kullanmadan)
	docker compose build --no-cache

# ---------- container içi erişim ----------

shell: ## App container'ına gir (sh)
	docker compose exec app sh

db-shell: ## Postgres'e psql ile bağlan
	docker compose exec postgres psql -U postgres -d flowdesk

# ---------- veritabanı ----------

migration-generate: ## Migration üret — kullanım: make migration-generate name=AddUsers
	docker compose exec app npm run migration:generate -- src/database/migrations/$(name)

migration-run: ## Bekleyen migration'ları çalıştır
	docker compose exec app npm run migration:run

migration-revert: ## Son migration'ı geri al
	docker compose exec app npm run migration:revert

seed: ## Seed verisini yükle
	docker compose exec app npm run seed

# ---------- test & kalite ----------

test: ## Unit testleri çalıştır
	docker compose exec app npm run test

test-watch: ## Testleri watch modda çalıştır
	docker compose exec app npm run test:watch

test-cov: ## Coverage raporu üret
	docker compose exec app npm run test:cov

test-e2e: ## E2E testleri çalıştır
	docker compose exec app npm run test:e2e

lint: ## ESLint çalıştır (--fix ile)
	docker compose exec app npm run lint

format: ## Prettier ile formatla
	docker compose exec app npm run format

# ---------- temizlik ----------

clean: ## Container'ları durdur ve sil (volume korunur)
	docker compose down --remove-orphans

reset: ## DİKKAT: her şeyi sil, volume dahil (VERİ GİDER)
	@printf "Bu işlem veritabanını SİLECEK. Emin misin? [y/N] " && read ans && [ "$$ans" = "y" ]
	docker compose down -v --remove-orphans
	@echo "Sıfırlandı. 'make start' ile yeniden kur, 'make migration-run' + 'make seed' çalıştır."

prune: ## Kullanılmayan Docker verilerini temizle (yer açar)
	docker system prune -f

# ---------- production (VPS) ----------

prod-up: ## PROD: ayağa kaldır
	docker compose -f docker-compose.prod.yml up -d --build

prod-down: ## PROD: durdur
	docker compose -f docker-compose.prod.yml down

prod-logs: ## PROD: logları izle
	docker compose -f docker-compose.prod.yml logs -f app

prod-migrate: ## PROD: migration çalıştır
	docker compose -f docker-compose.prod.yml exec app npm run migration:run