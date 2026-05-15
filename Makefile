# BarberBook — top-level dev targets.
#
# These wrap the mobile (Expo) workspace so contributors can drive the
# RN client without remembering the paths. The Frappe Python side is
# managed via `bench` from the bench root, not this Makefile.

FRONTEND_DIR := barberbook/frontend
MOBILE_DIR   := $(FRONTEND_DIR)/mobile

.PHONY: help mobile-install mobile-dev mobile-ios mobile-android mobile-lint mobile-typecheck mobile-format

help:
	@echo "BarberBook mobile targets:"
	@echo "  make mobile-install    Install all workspace deps (yarn)"
	@echo "  make mobile-dev        Start Expo dev server (Metro)"
	@echo "  make mobile-ios        Open the app on iOS simulator"
	@echo "  make mobile-android    Open the app on Android emulator"
	@echo "  make mobile-lint       ESLint (eslint-config-universe)"
	@echo "  make mobile-typecheck  tsc --noEmit"
	@echo "  make mobile-format     Prettier --write"

mobile-install:
	cd $(FRONTEND_DIR) && yarn install

mobile-dev:
	cd $(MOBILE_DIR) && yarn start

mobile-ios:
	cd $(MOBILE_DIR) && yarn ios

mobile-android:
	cd $(MOBILE_DIR) && yarn android

mobile-lint:
	cd $(MOBILE_DIR) && yarn lint

mobile-typecheck:
	cd $(MOBILE_DIR) && yarn typecheck

mobile-format:
	cd $(MOBILE_DIR) && yarn format
