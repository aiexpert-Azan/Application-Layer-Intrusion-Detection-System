class MockClassifier:
    def classify(self, text: str) -> dict:
        return {"intent": "unknown", "confidence": 0.0}
