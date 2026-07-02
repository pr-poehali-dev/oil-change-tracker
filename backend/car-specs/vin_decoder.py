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

# Японские номера кузова (код шасси) -> (марка, модель).
# Ключ — буквенно-цифровой префикс до дефиса/серийника (напр. GX110-6001234 -> "GX110").
# Сопоставляем по наиболее длинному совпадающему префиксу.
JDM_BODY_CODES = {
    # --- Toyota ---
    "GX90": ("Toyota", "Mark II"), "JZX90": ("Toyota", "Mark II"),
    "GX100": ("Toyota", "Mark II"), "JZX100": ("Toyota", "Mark II"),
    "GX110": ("Toyota", "Mark II"), "JZX110": ("Toyota", "Mark II"),
    "GX105": ("Toyota", "Mark II"), "JZX105": ("Toyota", "Mark II"),
    "GRX120": ("Toyota", "Mark X"), "GRX130": ("Toyota", "Mark X"),
    "JZX81": ("Toyota", "Chaser"), "GX81": ("Toyota", "Cresta"),
    "AE86": ("Toyota", "Sprinter Trueno"), "AE85": ("Toyota", "Sprinter"),
    "AE100": ("Toyota", "Corolla"), "AE110": ("Toyota", "Corolla"),
    "AE111": ("Toyota", "Levin"), "EE90": ("Toyota", "Corolla"),
    "ZZE122": ("Toyota", "Corolla"), "ZZE120": ("Toyota", "Corolla"),
    "ZZE121": ("Toyota", "Corolla"), "NZE121": ("Toyota", "Corolla"),
    "NZE141": ("Toyota", "Corolla Axio"), "NZE144": ("Toyota", "Corolla Fielder"),
    "ZRE142": ("Toyota", "Corolla"), "ZRE212": ("Toyota", "Corolla"),
    "SV30": ("Toyota", "Camry"), "SV40": ("Toyota", "Camry"),
    "SV41": ("Toyota", "Camry"), "SV43": ("Toyota", "Camry"),
    "ACV30": ("Toyota", "Camry"), "ACV40": ("Toyota", "Camry"),
    "ACV51": ("Toyota", "Camry"), "AVV50": ("Toyota", "Camry"),
    "AXVH70": ("Toyota", "Camry"), "ST190": ("Toyota", "Carina"),
    "ST195": ("Toyota", "Carina"), "AT211": ("Toyota", "Carina"),
    "AT212": ("Toyota", "Corona"), "ST215": ("Toyota", "Caldina"),
    "AZT240": ("Toyota", "Caldina"), "ST246": ("Toyota", "Caldina"),
    "NCP10": ("Toyota", "Vitz"), "NCP13": ("Toyota", "Vitz"),
    "SCP10": ("Toyota", "Vitz"), "KSP90": ("Toyota", "Vitz"),
    "NCP91": ("Toyota", "Vitz"), "NSP130": ("Toyota", "Vitz"),
    "NHP10": ("Toyota", "Aqua"), "NHW20": ("Toyota", "Prius"),
    "ZVW30": ("Toyota", "Prius"), "ZVW50": ("Toyota", "Prius"),
    "JZS147": ("Toyota", "Aristo"), "JZS161": ("Toyota", "Aristo"),
    "UZS143": ("Toyota", "Crown"), "JZS155": ("Toyota", "Crown"),
    "JZS171": ("Toyota", "Crown"), "GRS182": ("Toyota", "Crown"),
    "GRS200": ("Toyota", "Crown"), "SXE10": ("Toyota", "Altezza"),
    "GXE10": ("Toyota", "Altezza"), "JZA80": ("Toyota", "Supra"),
    "JZA70": ("Toyota", "Supra"), "SW20": ("Toyota", "MR2"),
    "ZZW30": ("Toyota", "MR-S"), "ST202": ("Toyota", "Celica"),
    "ST205": ("Toyota", "Celica"), "ZZT231": ("Toyota", "Celica"),
    "RZN215": ("Toyota", "Hilux Surf"), "KZN185": ("Toyota", "Hilux Surf"),
    "VZN185": ("Toyota", "Hilux Surf"), "TRN215": ("Toyota", "Surf"),
    "GRN215": ("Toyota", "Surf"), "ACA20": ("Toyota", "RAV4"),
    "ACA30": ("Toyota", "RAV4"), "SXA10": ("Toyota", "RAV4"),
    "ZSU60": ("Toyota", "Harrier"), "MCU10": ("Toyota", "Harrier"),
    "ACU30": ("Toyota", "Harrier"), "GSU30": ("Toyota", "Harrier"),
    "UCF20": ("Toyota", "Celsior"), "UCF30": ("Toyota", "Celsior"),
    "NCP60": ("Toyota", "Ist"), "NZE151": ("Toyota", "Corolla Rumion"),
    "ANH20": ("Toyota", "Alphard"), "ANH10": ("Toyota", "Alphard"),
    "AGH30": ("Toyota", "Alphard"), "GGH20": ("Toyota", "Vellfire"),
    "ZRR70": ("Toyota", "Noah"), "ZWR80": ("Toyota", "Noah"),
    "ACR50": ("Toyota", "Estima"), "GSR50": ("Toyota", "Estima"),
    "KDH200": ("Toyota", "Hiace"), "TRH200": ("Toyota", "Hiace"),
    # --- Nissan ---
    "R32": ("Nissan", "Skyline"), "R33": ("Nissan", "Skyline"),
    "R34": ("Nissan", "Skyline"), "R35": ("Nissan", "GT-R"),
    "BNR32": ("Nissan", "Skyline GT-R"), "BCNR33": ("Nissan", "Skyline GT-R"),
    "BNR34": ("Nissan", "Skyline GT-R"), "ER34": ("Nissan", "Skyline"),
    "HR34": ("Nissan", "Skyline"), "V35": ("Nissan", "Skyline"),
    "V36": ("Nissan", "Skyline"), "S13": ("Nissan", "Silvia"),
    "S14": ("Nissan", "Silvia"), "S15": ("Nissan", "Silvia"),
    "PS13": ("Nissan", "Silvia"), "RPS13": ("Nissan", "180SX"),
    "Z32": ("Nissan", "Fairlady Z"), "Z33": ("Nissan", "Fairlady Z"),
    "Z34": ("Nissan", "Fairlady Z"), "C33": ("Nissan", "Laurel"),
    "C34": ("Nissan", "Laurel"), "C35": ("Nissan", "Laurel"),
    "A31": ("Nissan", "Cefiro"), "A32": ("Nissan", "Cefiro"),
    "A33": ("Nissan", "Cefiro"), "J31": ("Nissan", "Teana"),
    "J32": ("Nissan", "Teana"), "L33": ("Nissan", "Teana"),
    "K11": ("Nissan", "March"), "K12": ("Nissan", "March"),
    "K13": ("Nissan", "March"), "AK12": ("Nissan", "March"),
    "B15": ("Nissan", "Sunny"), "N16": ("Nissan", "Almera"),
    "P11": ("Nissan", "Primera"), "P12": ("Nissan", "Primera"),
    "E11": ("Nissan", "Note"), "E12": ("Nissan", "Note"),
    "C11": ("Nissan", "Tiida"), "C12": ("Nissan", "Tiida"),
    "T30": ("Nissan", "X-Trail"), "T31": ("Nissan", "X-Trail"),
    "T32": ("Nissan", "X-Trail"), "NT30": ("Nissan", "X-Trail"),
    "Z50": ("Nissan", "Murano"), "Z51": ("Nissan", "Murano"),
    "Y33": ("Nissan", "Cedric"), "Y34": ("Nissan", "Cedric"),
    "WGNC34": ("Nissan", "Stagea"), "M35": ("Nissan", "Stagea"),
    "R50": ("Nissan", "Terrano"), "Y61": ("Nissan", "Safari"),
    "Y62": ("Nissan", "Patrol"), "ZE0": ("Nissan", "Leaf"),
    # --- Honda ---
    "EF": ("Honda", "Civic"), "EG": ("Honda", "Civic"),
    "EK": ("Honda", "Civic"), "EU": ("Honda", "Civic"),
    "FD": ("Honda", "Civic"), "FN": ("Honda", "Civic"),
    "EP3": ("Honda", "Civic Type R"), "FD2": ("Honda", "Civic Type R"),
    "EG6": ("Honda", "Civic"), "EK9": ("Honda", "Civic Type R"),
    "DC2": ("Honda", "Integra"), "DC5": ("Honda", "Integra"),
    "DB8": ("Honda", "Integra"), "CB7": ("Honda", "Accord"),
    "CD5": ("Honda", "Accord"), "CF4": ("Honda", "Accord"),
    "CL7": ("Honda", "Accord"), "CL9": ("Honda", "Accord"),
    "CU2": ("Honda", "Accord"), "CR2": ("Honda", "Accord"),
    "CP3": ("Honda", "Inspire"), "UA5": ("Honda", "Inspire"),
    "RD1": ("Honda", "CR-V"), "RD5": ("Honda", "CR-V"),
    "RE4": ("Honda", "CR-V"), "RM4": ("Honda", "CR-V"),
    "RW1": ("Honda", "CR-V"), "GD1": ("Honda", "Fit"),
    "GE6": ("Honda", "Fit"), "GK3": ("Honda", "Fit"),
    "GP1": ("Honda", "Fit"), "RU1": ("Honda", "Vezel"),
    "RA6": ("Honda", "Odyssey"), "RB1": ("Honda", "Odyssey"),
    "RC1": ("Honda", "Odyssey"), "RN6": ("Honda", "Stream"),
    "RF3": ("Honda", "Stepwgn"), "RG1": ("Honda", "Stepwgn"),
    "RK5": ("Honda", "Stepwgn"), "AP1": ("Honda", "S2000"),
    "AP2": ("Honda", "S2000"), "NA1": ("Honda", "NSX"),
    "NA2": ("Honda", "NSX"), "JF1": ("Honda", "N-Box"),
    # --- Mazda ---
    "FD3S": ("Mazda", "RX-7"), "FC3S": ("Mazda", "RX-7"),
    "SE3P": ("Mazda", "RX-8"), "NA6CE": ("Mazda", "MX-5"),
    "NB8C": ("Mazda", "Roadster"), "NCEC": ("Mazda", "Roadster"),
    "ND5RC": ("Mazda", "MX-5"), "BK5P": ("Mazda", "Axela"),
    "BL5FP": ("Mazda", "Axela"), "BM5FP": ("Mazda", "Axela"),
    "GG3P": ("Mazda", "Atenza"), "GH5FP": ("Mazda", "Atenza"),
    "GJ2FP": ("Mazda", "Atenza"), "DE3FS": ("Mazda", "Demio"),
    "DE5FS": ("Mazda", "Demio"), "DJ5FS": ("Mazda", "Demio"),
    "CX3": ("Mazda", "CX-3"), "KE2FW": ("Mazda", "CX-5"),
    "KF2P": ("Mazda", "CX-5"),
    # --- Mitsubishi ---
    "CT9A": ("Mitsubishi", "Lancer Evolution"), "CZ4A": ("Mitsubishi", "Lancer Evolution"),
    "CN9A": ("Mitsubishi", "Lancer Evolution"), "CP9A": ("Mitsubishi", "Lancer Evolution"),
    "CS5A": ("Mitsubishi", "Lancer Cedia"), "CY4A": ("Mitsubishi", "Galant Fortis"),
    "CU2W": ("Mitsubishi", "Airtrek"), "CW5W": ("Mitsubishi", "Outlander"),
    "GF7W": ("Mitsubishi", "Outlander"), "GG2W": ("Mitsubishi", "Outlander"),
    "V73W": ("Mitsubishi", "Pajero"), "V83W": ("Mitsubishi", "Pajero"),
    "V93W": ("Mitsubishi", "Pajero"), "KH4W": ("Mitsubishi", "Pajero Sport"),
    "Z27A": ("Mitsubishi", "Colt"),
    # --- Subaru ---
    "GC8": ("Subaru", "Impreza WRX"), "GDB": ("Subaru", "Impreza WRX"),
    "GDA": ("Subaru", "Impreza"), "GRB": ("Subaru", "Impreza WRX STI"),
    "GVB": ("Subaru", "Impreza WRX STI"), "GH8": ("Subaru", "Impreza"),
    "GP7": ("Subaru", "Impreza"), "VAB": ("Subaru", "WRX STI"),
    "VAG": ("Subaru", "WRX"), "BE5": ("Subaru", "Legacy B4"),
    "BH5": ("Subaru", "Legacy"), "BL5": ("Subaru", "Legacy B4"),
    "BP5": ("Subaru", "Legacy"), "BM9": ("Subaru", "Legacy"),
    "BR9": ("Subaru", "Legacy"), "BRZ": ("Subaru", "BRZ"),
    "ZC6": ("Subaru", "BRZ"), "SG5": ("Subaru", "Forester"),
    "SG9": ("Subaru", "Forester"), "SH5": ("Subaru", "Forester"),
    "SH9": ("Subaru", "Forester"), "SJ5": ("Subaru", "Forester"),
    "SJG": ("Subaru", "Forester"), "SK9": ("Subaru", "Forester"),
    "GP6": ("Subaru", "XV"), "GT7": ("Subaru", "XV"),
}


def decode_body_code(code: str) -> dict:
    """Декодирует японский номер кузова (код шасси) -> марка + модель.

    Принимает строки вида 'GX110-6001234', 'ZZE122', 'EF9', 'JZX100 1012345'.
    Ищем по наиболее длинному совпадающему префиксу.
    """
    raw = (code or "").strip().upper().replace(" ", "")
    # Берём часть до первого разделителя (дефис) — это префикс модели
    prefix = raw.split("-")[0]
    if not prefix:
        return {"valid": False, "error": "Пустой номер кузова", "brand": "", "year": "", "model": ""}

    # Пробуем от самого длинного возможного префикса к короткому
    for length in range(min(len(prefix), 7), 1, -1):
        key = prefix[:length]
        if key in JDM_BODY_CODES:
            brand, model = JDM_BODY_CODES[key]
            return {
                "valid": True, "error": "",
                "brand": brand, "model": model, "year": "",
                "country": "Япония", "source": "body_code", "wmi": key,
            }

    return {
        "valid": False,
        "error": "Код кузова не распознан. Заполните марку и модель вручную.",
        "brand": "", "year": "", "model": "",
    }


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
    """Декодирует VIN или японский номер кузова.

    Возвращает {brand, model?, year, country, valid, error, source}.
    """
    raw = (vin or "").strip()
    has_dash = "-" in raw
    v = raw.upper().replace(" ", "").replace("-", "")

    # Не полноценный 17-значный VIN -> пробуем как японский код кузова
    if len(v) != 17 or has_dash:
        body = decode_body_code(raw)
        if body.get("valid"):
            return body
        # Если это был короткий код и он не распознан — вернём ошибку кода кузова
        if len(v) != 17:
            return {
                "valid": False,
                "error": "Не похоже на VIN (17 символов) или известный код кузова. Заполните вручную.",
                "brand": "", "year": "", "model": "",
            }

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
        "source": "vin",
        "wmi": wmi3,
    }