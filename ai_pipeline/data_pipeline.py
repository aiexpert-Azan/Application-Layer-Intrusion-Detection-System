"""
data_pipeline.py
----------------
Downloads, cleans, balances, and merges 4 datasets for the
Application-Layer IDS BERT classifier.

Outputs:
    data/train.csv   (~80% of rows)
    data/val.csv     (~10% of rows)
    data/test.csv    (~10% of rows)

Each CSV has two columns: text, label
    0 = SAFE
    1 = PROMPT_INJECTION
    2 = SENSITIVE_INFO
    3 = OUTPUT_INJECTION
"""

import os
import pandas as pd
from datasets import load_dataset
from sklearn.model_selection import train_test_split

# ---------- CONFIG ----------
SAMPLES_PER_CLASS = 2000          # target rows per label (8000 total)
MIN_TEXT_LEN = 5                  # drop very short strings
MAX_TEXT_LEN = 2000               # drop very long strings
RANDOM_SEED = 42                  # for reproducibility

OUTPUT_DIR = "data"
RAW_DIR = os.path.join(OUTPUT_DIR, "raw")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)


# ---------- HELPERS ----------
def clean_texts(series: pd.Series) -> pd.Series:
    """Strip whitespace, drop nulls/duplicates/empty/too-short/too-long."""
    s = series.dropna().astype(str).str.strip()
    s = s[s.str.len().between(MIN_TEXT_LEN, MAX_TEXT_LEN)]
    s = s.drop_duplicates()
    return s.reset_index(drop=True)


def sample_balanced(series: pd.Series, label: int, n: int) -> pd.DataFrame:
    """Sample up to n rows; if fewer available, take all."""
    if len(series) > n:
        series = series.sample(n=n, random_state=RANDOM_SEED)
    df = pd.DataFrame({"text": series.values, "label": label})
    print(f"  Label {label}: kept {len(df)} rows")
    return df


# ---------- LABEL 0: SAFE ----------
def load_safe() -> pd.DataFrame:
    print("\n[1/4] Loading SAFE (fka/awesome-chatgpt-prompts)...")
    ds = load_dataset("fka/awesome-chatgpt-prompts", split="train")
    df = ds.to_pandas()
    # this dataset has columns ['act', 'prompt'] — we use 'prompt'
    texts = clean_texts(df["prompt"])
    return sample_balanced(texts, label=0, n=SAMPLES_PER_CLASS)


# ---------- LABEL 1: PROMPT_INJECTION ----------
def load_prompt_injection() -> pd.DataFrame:
    print("\n[2/4] Loading PROMPT_INJECTION (multiple sources)...")
    all_texts = []

    # Source 1: deepset/prompt-injections (small but high quality)
    print("  Source 1: deepset/prompt-injections")
    ds = load_dataset("deepset/prompt-injections")
    df1 = pd.concat([ds["train"].to_pandas(), ds["test"].to_pandas()], ignore_index=True)
    df1 = df1[df1["label"] == 1]
    all_texts.append(clean_texts(df1["text"]))

    # Source 2: jayavibhav/prompt-injection-safety (larger supplement)
    print("  Source 2: jayavibhav/prompt-injection-safety")
    try:
        ds2 = load_dataset("jayavibhav/prompt-injection-safety", split="train[:10000]")
        df2 = ds2.to_pandas()
        # this dataset uses 'label' where 1 = jailbreak/injection
        df2 = df2[df2["label"] == 1]
        all_texts.append(clean_texts(df2["text"]))
    except Exception as e:
        print(f"  (skipping source 2: {e})")

    combined = pd.concat(all_texts, ignore_index=True).drop_duplicates().reset_index(drop=True)
    print(f"  Combined pool: {len(combined)} unique injection samples")
    return sample_balanced(combined, label=1, n=SAMPLES_PER_CLASS)

# ---------- LABEL 2: SENSITIVE_INFO ----------
def load_sensitive_info() -> pd.DataFrame:
    print("\n[3/4] Loading SENSITIVE_INFO (ai4privacy/pii-masking-200k)...")
    # this dataset is huge — load only what we need by streaming a slice
    ds = load_dataset("ai4privacy/pii-masking-200k", split="train[:5000]")
    df = ds.to_pandas()
    # the unmasked text column is 'source_text'
    texts = clean_texts(df["source_text"])
    return sample_balanced(texts, label=2, n=SAMPLES_PER_CLASS)


# ---------- LABEL 3: OUTPUT_INJECTION ----------
def load_output_injection() -> pd.DataFrame:
    print("\n[4/4] Loading OUTPUT_INJECTION (SQL injection dataset)...")
    csv_path = os.path.join(RAW_DIR, "sql_injection.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"\n\nMissing file: {csv_path}\n"
            f"Please:\n"
            f"  1. Go to https://www.kaggle.com/datasets/sajid576/sql-injection-dataset\n"
            f"  2. Download the CSV file\n"
            f"  3. Rename it to 'sql_injection.csv'\n"
            f"  4. Place it inside the folder: {RAW_DIR}\n"
            f"  5. Re-run this script.\n"
        )
    df = pd.read_csv(csv_path)
    # try common column names
    text_col = None
    for candidate in ["Sentence", "sentence", "Query", "query", "text", "Text", "payload"]:
        if candidate in df.columns:
            text_col = candidate
            break
    if text_col is None:
        raise ValueError(f"Could not find text column in CSV. Columns are: {list(df.columns)}")
    # if there's a label column, keep only malicious rows (label == 1)
    for label_col in ["Label", "label", "class"]:
        if label_col in df.columns:
            df = df[df[label_col] == 1]
            break
    texts = clean_texts(df[text_col])
    return sample_balanced(texts, label=3, n=SAMPLES_PER_CLASS)


# ---------- MAIN ----------
def main():
    print("=" * 60)
    print("DATA PIPELINE — Application-Layer IDS")
    print("=" * 60)

    parts = [
        load_safe(),
        load_prompt_injection(),
        load_sensitive_info(),
        load_output_injection(),
    ]
    full_df = pd.concat(parts, ignore_index=True)
    full_df = full_df.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)

    print("\n" + "=" * 60)
    print(f"TOTAL ROWS: {len(full_df)}")
    print("Class distribution:")
    print(full_df["label"].value_counts().sort_index().to_string())
    print("=" * 60)

    # 80/10/10 stratified split
    train_df, temp_df = train_test_split(
        full_df, test_size=0.20, random_state=RANDOM_SEED, stratify=full_df["label"]
    )
    val_df, test_df = train_test_split(
        temp_df, test_size=0.50, random_state=RANDOM_SEED, stratify=temp_df["label"]
    )

    train_path = os.path.join(OUTPUT_DIR, "train.csv")
    val_path = os.path.join(OUTPUT_DIR, "val.csv")
    test_path = os.path.join(OUTPUT_DIR, "test.csv")

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"\nSaved:")
    print(f"  {train_path}  ({len(train_df)} rows)")
    print(f"  {val_path}    ({len(val_df)} rows)")
    print(f"  {test_path}   ({len(test_df)} rows)")
    print("\nDone.\n")


if __name__ == "__main__":
    main()