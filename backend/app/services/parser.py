import re
from datetime import date
from typing import Dict, Any, Optional, Tuple, List

# Dicionário de mapeamento de palavras-chave para categorias padrão
CATEGORY_KEYWORDS = {
    "Alimentação": [
        "alimentação", "alimentacao", "almoço", "almoco", "jantar", "lanche", 
        "comida", "mercado", "supermercado", "ifood", "restaurante", "café", 
        "cafe", "padaria", "pizza", "hamburguer", "açougue", "acougue", "feira"
    ],
    "Transporte": [
        "transporte", "uber", "99", "gasolina", "combustível", "combustivel", 
        "metrô", "metro", "ônibus", "onibus", "estacionamento", "pedágio", 
        "pedagio", "passagem", "ipva", "mecânico", "mecanico", "oficina"
    ],
    "Moradia": [
        "moradia", "aluguel", "condomínio", "condominio", "luz", "energia", 
        "água", "agua", "internet", "gás", "gas", "iptu", "manutenção", "reforma", "enel"
    ],
    "Saúde": [
        "saúde", "saude", "farmácia", "farmacia", "remédio", "remedio", 
        "médico", "medico", "consulta", "dentista", "exame", "hospital", 
        "psicólogo", "psicologo", "academia"
    ],
    "Lazer": [
        "lazer", "cinema", "jogo", "game", "streaming", "netflix", "spotify", 
        "viagem", "bar", "cerveja", "festa", "show", "passeio", "praia", "livraria"
    ],
    "Educação": [
        "educação", "educacao", "curso", "livro", "faculdade", "escola", 
        "udemy", "alura", "material", "mensalidade"
    ],
    "Salário": [
        "salário", "salario", "pagamento", "remuneração", "pro-labore", "pró-labore", "adiantamento"
    ],
    "Investimentos": [
        "investimentos", "investimento", "ação", "acoes", "cdi", "fii", 
        "cripto", "bitcoin", "poupança", "poupanca", "dividendo", "rendimento"
    ]
}

INCOME_KEYWORDS = [
    "entrada", "receita", "salário", "salario", "ganho", "ganhos", 
    "depósito", "deposito", "pix recebido", "recebido", "rendimento", 
    "venda", "freelance", "bônus", "bonus", "reembolso"
]

def parse_transaction_text(text: str) -> Dict[str, Any]:
    """
    Interpreta uma string em linguagem natural e extrai:
    - amount (float)
    - type ('EXPENSE' ou 'INCOME')
    - description (str)
    - category_hint (str ou None)
    - date (str YYYY-MM-DD)
    
    Exemplos aceitos:
    - "Almoço 25.50 alimentação"
    - "Uber 14 transporte"
    - "Salário 3000 entrada"
    - "Pizza 49,90"
    - "+3500 Freelance"
    - "-45 Farmacia saude"
    - "R$ 150,00 Conta de luz moradia"
    """
    raw = text.strip()
    if not raw:
        raise ValueError("Texto vazio para interpretação.")

    # 1. Detectar tipo inicial (Receita / Despesa)
    is_income = False
    if raw.startswith("+"):
        is_income = True
        raw = raw[1:].strip()
    elif raw.startswith("-"):
        is_income = False
        raw = raw[1:].strip()

    # Checar palavras-chave de receita no texto
    text_lower = raw.lower()
    for kw in INCOME_KEYWORDS:
        # Busca como palavra isolada ou marcador
        if re.search(rf"\b{re.escape(kw)}\b", text_lower):
            is_income = True
            break

    # 2. Localizar o valor monetário
    # Padrão: R$ opcional, dígitos com . ou , decimais opcionais
    # Ex: 1.250,50 | 1250.50 | 25,50 | 25.50 | 14
    amount_pattern = r'(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{1,2}|\d+\.\d{1,2}|\b\d+\b)'
    match = re.search(amount_pattern, raw)
    
    if not match:
        raise ValueError("Nenhum valor numérico identificado na mensagem.")

    amount_str = match.group(1)
    span = match.span()

    # Converter valor para float
    clean_val = amount_str.replace(" ", "")
    if "," in clean_val and "." in clean_val:
        # Ex: 1.250,50 -> 1250.50
        clean_val = clean_val.replace(".", "").replace(",", ".")
    elif "," in clean_val:
        # Ex: 25,50 -> 25.50
        clean_val = clean_val.replace(",", ".")
    
    amount = float(clean_val)
    if amount <= 0:
        raise ValueError("O valor deve ser maior que zero.")

    # 3. Remover a parte do valor do texto para analisar o restante
    remaining_text = (raw[:span[0]] + " " + raw[span[1]:]).strip()
    # Limpar prefixo R$ se sobrou
    remaining_text = re.sub(r'\bR\$\b', '', remaining_text, flags=re.IGNORECASE).strip()

    # 4. Identificar categoria
    category_hint: Optional[str] = None
    remaining_lower = remaining_text.lower()

    # Tenta casar palavras-chave com as categorias conhecidas
    for cat_name, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            pattern = rf"\b{re.escape(kw)}\b"
            if re.search(pattern, remaining_lower):
                category_hint = cat_name
                break
        if category_hint:
            break

    # 5. Limpar palavras de controle da descrição
    # Remove palavras como 'entrada', 'despesa', ou o nome explícito da categoria do final se for repetitivo
    words = remaining_text.split()
    clean_words = []
    
    for w in words:
        w_clean = re.sub(r'[^\w\-]', '', w).lower()
        if w_clean in ["entrada", "saida", "saída", "gasto", "despesa"]:
            continue
        clean_words.append(w)

    description = " ".join(clean_words).strip()

    # Se a descrição terminar com o nome da categoria ou uma palavra-chave dela, remove o sufixo repetido
    if category_hint and len(clean_words) > 1:
        last_word_clean = re.sub(r'[^\w\-]', '', clean_words[-1]).lower()
        if last_word_clean == category_hint.lower() or last_word_clean in CATEGORY_KEYWORDS.get(category_hint, []):
            clean_words.pop()
            description = " ".join(clean_words).strip()

    # Se a descrição ficou vazia, utiliza a categoria ou fallback
    if not description:
        if category_hint:
            description = category_hint
        elif is_income:
            description = "Receita"
        else:
            description = "Despesa"

    # Capitalizar a primeira letra
    description = description[0].upper() + description[1:] if len(description) > 1 else description.upper()

    return {
        "amount": round(amount, 2),
        "type": "INCOME" if is_income else "EXPENSE",
        "description": description,
        "category_hint": category_hint,
        "date": date.today().isoformat()
    }
