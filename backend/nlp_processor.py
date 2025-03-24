import re
import os
import spacy
from collections import defaultdict
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load spaCy models
try:
    nlp_en = spacy.load("en_core_web_sm")
    logger.info("Loaded English spaCy model")
except:
    logger.warning("English model not found, will try to download...")
    os.system("python -m spacy download en_core_web_sm")
    nlp_en = spacy.load("en_core_web_sm")

try:
    nlp_he = spacy.load("he_core_news_sm")
    logger.info("Loaded Hebrew spaCy model")
except:
    logger.warning("Hebrew model not found, will try to download...")
    os.system("python -m spacy download he_core_news_sm")
    nlp_he = spacy.load("he_core_news_sm")

def detect_language(text):
    """Detect if text is primarily in English or Hebrew"""
    hebrew_chars = re.findall(r'[\u0590-\u05FF]', text)
    if len(hebrew_chars) > len(text) * 0.15:  # If more than 15% is Hebrew
        return "he"
    else:
        return "en"

def detect_file_type(content):
    """Detect if file is a WhatsApp chat or Wikipedia talk page"""
    whatsapp_pattern = r'^\[\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4},?\s\d{1,2}:\d{2}(:\d{2})?\]'
    
    # Check first few lines
    first_lines = content.split('\n')[:10]
    for line in first_lines:
        if re.match(whatsapp_pattern, line):
            return "whatsapp"
            
    # Check for Wikipedia patterns
    if any("User:" in line or "משתמש:" in line for line in first_lines):
        return "wikipedia"
    
    # Default to whatsapp as it's more common
    return "whatsapp"

def extract_entities(text, language):
    """Extract named entities from text"""
    if language == "he":
        doc = nlp_he(text)
    else:
        doc = nlp_en(text)
    
    entities = {}
    for ent in doc.ents:
        entities[ent.text] = ent.label_
    
    return entities

def extract_topics(text, language):
    """Extract main topics from text using NLP"""
    if language == "he":
        doc = nlp_he(text)
    else:
        doc = nlp_en(text)
    
    # Simple implementation - extract noun chunks
    topics = [chunk.text.lower() for chunk in doc.noun_chunks 
              if len(chunk.text) > 3 and not chunk.text.isdigit()]
    
    # Count frequency
    topic_counts = defaultdict(int)
    for topic in topics:
        topic_counts[topic] += 1
    
    # Return top 5 topics
    return sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:5]

def parse_whatsapp_message(line):
    """Enhanced WhatsApp message parsing with better pattern matching"""
    # Format: [date, time] Sender: Message
    # Handle different date formats (day.month.year, day/month/year)
    whatsapp_pattern = r'^\[(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?)\]\s(.+?):\s(.*)$'
    match = re.match(whatsapp_pattern, line)
    
    if match:
        date, time, sender, message = match.groups()
        # Clean sender name (remove emojis, special chars)
        sender = re.sub(r'[^\w\s\u0590-\u05FF\u0600-\u06FF]', '', sender).strip()
        
        # Handle phone numbers
        if sender.startswith('+') or sender.startswith('\u202a+'):
            sender = f"Phone_{abs(hash(sender)) % 10000}"
        
        return {
            "date": date,
            "time": time,
            "sender": sender,
            "message": message
        }
    
    return None

def parse_whatsapp_file(content):
    """Parse entire WhatsApp chat file"""
    messages = []
    language = detect_language(content)
    
    for line in content.split('\n'):
        parsed = parse_whatsapp_message(line)
        if parsed:
            # Add language detection for each message
            parsed["language"] = detect_language(parsed["message"])
            
            # Add entity extraction
            parsed["entities"] = extract_entities(parsed["message"], parsed["language"])
            
            # Add topic extraction
            parsed["topics"] = extract_topics(parsed["message"], parsed["language"])
            
            messages.append(parsed)
    
    return messages, language

def parse_wikipedia_message(line):
    """Enhanced Wikipedia talk page message parsing"""
    # Look for users
    wiki_sender_pattern = r'.*?(User:|משתמש:)([^\]]+).*'
    wiki_comment_pattern = r'^(:{0,5})(.+)'
    
    sender_match = re.search(wiki_sender_pattern, line)
    comment_match = re.match(wiki_comment_pattern, line)
    
    if sender_match:
        sender = sender_match.group(2).strip()
        return {"sender": sender, "message": line, "indentation": 0}
    
    if comment_match:
        indentation = len(comment_match.group(1))
        message = comment_match.group(2).strip()
        return {"message": message, "indentation": indentation}
    
    return None

def parse_wikipedia_file(content):
    """Parse entire Wikipedia talk page file"""
    messages = []
    language = detect_language(content)
    
    lines = content.split('\n')
    current_sender = None
    previous_indentation = 0
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        parsed = parse_wikipedia_message(line)
        
        if parsed and "sender" in parsed:
            current_sender = parsed["sender"]
            previous_indentation = parsed["indentation"]
            messages.append({
                "sender": current_sender,
                "message": parsed["message"],
                "indentation": parsed["indentation"],
                "language": detect_language(parsed["message"])
            })
        elif parsed and current_sender and parsed["indentation"] >= previous_indentation:
            # Same or deeper indentation, assume same sender
            messages.append({
                "sender": current_sender,
                "message": parsed["message"],
                "indentation": parsed["indentation"],
                "language": detect_language(parsed["message"])
            })
        elif parsed and current_sender and parsed["indentation"] < previous_indentation:
            # Less indentation, this could be a reply to a different user
            # We'll use indentation to build a conversation tree and assign likely respondents
            # For simplicity, we'll just find the last message with this indentation level
            potential_sender = current_sender
            for j in range(len(messages)-1, -1, -1):
                if messages[j]["indentation"] == parsed["indentation"]:
                    potential_sender = messages[j]["sender"]
                    break
            
            messages.append({
                "sender": potential_sender,
                "message": parsed["message"],
                "indentation": parsed["indentation"],
                "language": detect_language(parsed["message"])
            })
            
            previous_indentation = parsed["indentation"]
    
    # Add entity and topic extraction to messages
    for msg in messages:
        if "message" in msg:
            msg["entities"] = extract_entities(msg["message"], msg["language"])
            msg["topics"] = extract_topics(msg["message"], msg["language"])
    
    return messages, language

def parse_file(file_path):
    """Parse file and detect type, language, and extract messages"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        file_type = detect_file_type(content)
        
        if file_type == "whatsapp":
            return parse_whatsapp_file(content)
        else:
            return parse_wikipedia_file(content)
            
    except UnicodeDecodeError:
        # Try with different encoding if utf-8 fails
        try:
            with open(file_path, "r", encoding="iso-8859-1") as f:
                content = f.read()
            
            file_type = detect_file_type(content)
            
            if file_type == "whatsapp":
                return parse_whatsapp_file(content)
            else:
                return parse_wikipedia_file(content)
        except Exception as e:
            logger.error(f"Error parsing file with iso-8859-1 encoding: {e}")
            return [], "unknown"
    except Exception as e:
        logger.error(f"Error parsing file: {e}")
        return [], "unknown"
