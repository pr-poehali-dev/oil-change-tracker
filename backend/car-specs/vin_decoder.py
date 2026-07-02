"""Офлайн-декодер VIN: марка (по WMI) и год выпуска (по 10-й позиции).

Работает без внешних API. Возвращает бренд, год, страну — когда возможно.
VIN 17 символов. Позиции: 1-3 WMI, 10 — год, 11 — завод.
"""

# WMI (первые 3 символа) -> марка. Основные производители, популярные в РФ.
# Для некоторых марок WMI зависит от завода/страны, поэтому ключей несколько.
WMI_BRANDS = {
    # Toyota
    "JT": "Toyota", "JTD": "Toyota", "JTE": "Toyota", "JTN": "Toyota",
    "5TD": "Toyota", "5TB": "Toyota", "4T1": "Toyota", "2T1": "Toyota",
    "NMT": "Toyota", "SB1": "Toyota", "VNK": "Toyota", "MR0": "Toyota",
    # Lexus
    "JTH": "Lexus", "JTJ": "Lexus", "2T2": "Lexus", "58A": "Lexus",
    # Honda / Acura
    "JHM": "Honda", "JHL": "Honda", "1HG": "Honda", "2HG": "Honda",
    "3HG": "Honda", "SHH": "Honda", "19X": "Honda", "5FN": "Honda",
    "19U": "Acura", "JH4": "Acura",
    # Nissan / Infiniti
    "JN1": "Nissan", "JN6": "Nissan", "JN8": "Nissan", "1N4": "Nissan",
    "1N6": "Nissan", "3N1": "Nissan", "5N1": "Nissan", "VSK": "Nissan",
    "SJN": "Nissan", "JNK": "Infiniti", "JNR": "Infiniti", "5N3": "Infiniti",
    # Mazda
    "JM1": "Mazda", "JM3": "Mazda", "JM7": "Mazda", "4F2": "Mazda",
    "4F4": "Mazda", "1YV": "Mazda",
    # Mitsubishi
    "JA3": "Mitsubishi", "JA4": "Mitsubishi", "JMB": "Mitsubishi",
    "JMY": "Mitsubishi", "4A3": "Mitsubishi", "6MM": "Mitsubishi",
    "MMB": "Mitsubishi", "MMC": "Mitsubishi", "MMT": "Mitsubishi",
    # Subaru
    "JF1": "Subaru", "JF2": "Subaru", "4S3": "Subaru", "4S4": "Subaru",
    # Suzuki
    "JS2": "Suzuki", "JS3": "Suzuki", "TSM": "Suzuki", "MA3": "Suzuki",
    "KL5": "Suzuki",
    # Daihatsu / Isuzu
    "JDA": "Daihatsu", "JAA": "Isuzu", "JAB": "Isuzu", "JAC": "Isuzu",
    "4S1": "Isuzu", "4S2": "Isuzu",
    # Volkswagen
    "WVW": "Volkswagen", "WV1": "Volkswagen", "WV2": "Volkswagen",
    "1VW": "Volkswagen", "3VW": "Volkswagen", "9BW": "Volkswagen",
    "XW8": "Volkswagen",
    # Audi
    "WAU": "Audi", "WA1": "Audi", "TRU": "Audi", "93U": "Audi",
    # BMW
    "WBA": "BMW", "WBS": "BMW", "WBY": "BMW", "4US": "BMW", "5UX": "BMW",
    "WBX": "BMW", "5YM": "BMW",
    # Mercedes-Benz
    "WDB": "Mercedes-Benz", "WDD": "Mercedes-Benz", "WDC": "Mercedes-Benz",
    "WDF": "Mercedes-Benz", "4JG": "Mercedes-Benz", "55S": "Mercedes-Benz",
    "W1K": "Mercedes-Benz", "W1N": "Mercedes-Benz",
    # Porsche
    "WP0": "Porsche", "WP1": "Porsche",
    # Opel
    "W0L": "Opel", "W0V": "Opel",
    # Ford
    "1FA": "Ford", "1FB": "Ford", "1FC": "Ford", "1FD": "Ford",
    "1FM": "Ford", "1FT": "Ford", "2FA": "Ford", "3FA": "Ford",
    "WF0": "Ford", "6FP": "Ford", "MAJ": "Ford", "NM0": "Ford",
    # Hyundai
    "KMH": "Hyundai", "KMF": "Hyundai", "KM8": "Hyundai", "5NP": "Hyundai",
    "5NM": "Hyundai", "TMA": "Hyundai", "NLH": "Hyundai", "Z94": "Hyundai",
    # Kia
    "KNA": "Kia", "KND": "Kia", "KNE": "Kia", "KNM": "Kia", "5XY": "Kia",
    "5XX": "Kia", "U5Y": "Kia", "3KP": "Kia", "XWK": "Kia",
    # Genesis
    "KMT": "Genesis",
    # Renault
    "VF1": "Renault", "VF2": "Renault", "X7L": "Renault", "93Y": "Renault",
    "8A1": "Renault",
    # Peugeot / Citroen
    "VF3": "Peugeot", "VF7": "Citroën", "VR1": "Peugeot", "VR7": "Citroën",
    # Skoda
    "TMB": "Skoda", "TMP": "Skoda",
    # SEAT
    "VSS": "SEAT",
    # Volvo
    "YV1": "Volvo", "YV4": "Volvo", "YV2": "Volvo", "LVY": "Volvo",
    # Land Rover / Jaguar
    "SAL": "Land Rover", "SAJ": "Jaguar", "SAD": "Jaguar",
    # Jeep / Dodge / Chrysler
    "1J4": "Jeep", "1J8": "Jeep", "1C4": "Jeep", "3C4": "Jeep",
    "1B3": "Dodge", "2B3": "Dodge", "1C3": "Chrysler",
    # Chevrolet
    "1G1": "Chevrolet", "1GC": "Chevrolet", "2G1": "Chevrolet",
    "KL1": "Chevrolet", "3GN": "Chevrolet", "XUF": "Chevrolet",
    # Lada / ВАЗ
    "XTA": "Lada", "XTT": "Lada", "X9L": "Lada",
    # УАЗ / ГАЗ
    "XTT9": "УАЗ", "X89": "УАЗ", "XTH": "ГАЗ", "X96": "ГАЗ",
    # Chery / Geely / Haval / Changan / BYD
    "LVV": "Chery", "LVT": "Chery", "L6T": "Geely", "LB3": "Geely",
    "LFV": "Geely", "LGX": "BYD", "LC0": "Haval", "LGW": "Haval",
    "LS5": "Changan", "LS4": "Changan",
    # SsangYong
    "KPT": "SsangYong", "KPB": "SsangYong",
    # Mini / Smart
    "WMW": "Mini", "WME": "Smart",
    # Tesla
    "5YJ": "Tesla", "7SA": "Tesla", "LRW": "Tesla",
}

# Страны по первому символу WMI
COUNTRY_BY_CHAR = {
    "J": "Япония", "K": "Корея", "L": "Китай", "M": "Индия/Таиланд",
    "S": "Великобритания/ЕС", "T": "Чехия/Венгрия", "V": "Франция/Испания",
    "W": "Германия", "X": "Россия/Европа", "Y": "Швеция/Финляндия",
    "Z": "Италия", "1": "США", "2": "Канада", "3": "Мексика",
    "4": "США", "5": "США", "6": "Австралия", "9": "Бразилия/Аргентина",
}

# 10-я позиция VIN -> модельный год. Буквы I,O,Q,U,Z и 0 не используются.
YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789"


def _decode_year(char: str, wmi_year_hint: int = 0) -> int:
    """10-я позиция -> год. Коды повторяются каждые 30 лет (1980->2009->...).

    Возвращаем наиболее вероятный год из современного цикла.
    """
    char = char.upper()
    if char not in YEAR_CODES:
        return 0
    idx = YEAR_CODES.index(char)
    # Базовый цикл: 1980 + idx. Следующие циклы: +30, +60.
    candidates = [1980 + idx, 2010 + idx, 2040 + idx]
    # Отсекаем будущее (год не может быть больше следующего календарного)
    import datetime
    max_year = datetime.datetime.now().year + 1
    valid = [y for y in candidates if y <= max_year]
    if not valid:
        return candidates[0]
    # Берём самый свежий валидный (большинство машин в эксплуатации — новые циклы)
    return valid[-1]


def decode_vin(vin: str) -> dict:
    """Декодирует VIN. Возвращает {brand, year, country, valid, error}."""
    v = (vin or "").strip().upper().replace(" ", "").replace("-", "")

    if len(v) != 17:
        return {"valid": False, "error": "VIN должен содержать 17 символов", "brand": "", "year": ""}

    # В VIN не используются буквы I, O, Q
    if any(c in v for c in ("I", "O", "Q")):
        return {"valid": False, "error": "Недопустимые символы в VIN (I, O, Q)", "brand": "", "year": ""}

    wmi3 = v[:3]
    wmi2 = v[:2]
    wmi4 = v[:4]

    brand = ""
    # Сначала пробуем 4-символьные ключи (точнее), потом 3, потом 2
    if wmi4 in WMI_BRANDS:
        brand = WMI_BRANDS[wmi4]
    elif wmi3 in WMI_BRANDS:
        brand = WMI_BRANDS[wmi3]
    elif wmi2 in WMI_BRANDS:
        brand = WMI_BRANDS[wmi2]

    country = COUNTRY_BY_CHAR.get(v[0], "")

    year = _decode_year(v[9])

    return {
        "valid": True,
        "error": "",
        "brand": brand,
        "year": str(year) if year else "",
        "country": country,
        "wmi": wmi3,
    }
