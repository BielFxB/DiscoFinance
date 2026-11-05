import unittest
import sys
import os

# Adiciona o diretório backend ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.parser import parse_transaction_text
from app.auth import hash_password, verify_password, create_access_token, decode_access_token

class TestParser(unittest.TestCase):
    def test_expense_standard(self):
        result = parse_transaction_text("Almoço 25.50 alimentação")
        self.assertEqual(result["amount"], 25.50)
        self.assertEqual(result["type"], "EXPENSE")
        self.assertEqual(result["description"], "Almoço")
        self.assertEqual(result["category_hint"], "Alimentação")

    def test_expense_comma_decimal(self):
        result = parse_transaction_text("Uber 14,00 transporte")
        self.assertEqual(result["amount"], 14.00)
        self.assertEqual(result["type"], "EXPENSE")
        self.assertEqual(result["description"], "Uber")
        self.assertEqual(result["category_hint"], "Transporte")

    def test_income_keyword(self):
        result = parse_transaction_text("Salário 3000 entrada")
        self.assertEqual(result["amount"], 3000.00)
        self.assertEqual(result["type"], "INCOME")
        self.assertEqual(result["description"], "Salário")

    def test_prefix_plus_income(self):
        result = parse_transaction_text("+150 freelance")
        self.assertEqual(result["amount"], 150.00)
        self.assertEqual(result["type"], "INCOME")
        self.assertEqual(result["description"], "Freelance")

    def test_prefix_minus_expense(self):
        result = parse_transaction_text("-45 Farmacia saude")
        self.assertEqual(result["amount"], 45.00)
        self.assertEqual(result["type"], "EXPENSE")
        self.assertEqual(result["category_hint"], "Saúde")

    def test_formatted_brl_currency(self):
        result = parse_transaction_text("R$ 1.250,50 Aluguel moradia")
        self.assertEqual(result["amount"], 1250.50)
        self.assertEqual(result["type"], "EXPENSE")
        self.assertEqual(result["category_hint"], "Moradia")

    def test_invalid_text_raises_value_error(self):
        with self.assertRaises(ValueError):
            parse_transaction_text("Apenas texto sem nenhum valor")

class TestAuth(unittest.TestCase):
    def test_password_hash_and_verify(self):
        password = "MinhaSenhaSegura123!"
        hashed = hash_password(password)
        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("SenhaErrada", hashed))

    def test_jwt_token_creation_and_decode(self):
        payload = {"sub": "user-uuid-123", "email": "teste@email.com"}
        token = create_access_token(payload)
        decoded = decode_access_token(token)
        self.assertEqual(decoded["sub"], "user-uuid-123")
        self.assertEqual(decoded["email"], "teste@email.com")

if __name__ == "__main__":
    unittest.main()

