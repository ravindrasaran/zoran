from fastapi import FastAPI, HTTPException
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import List

app = FastAPI(title="RBSE Result Scraper API")

# Note: The exact URL changes every year (e.g., sec2024.htm, sen2024.htm).
# You will need to update this URL to the live one when results are announced.
RBSE_RESULT_URL = "http://rajresults.nic.in/resbserx19.htm"

class SubjectMark(BaseModel):
    subject: str
    theory: int
    practical: int
    total: int

class ResultResponse(BaseModel):
    name: str
    roll_no: str
    subject_wise_marks: List[SubjectMark]
    total_marks: int
    percentage: float
    result_status: str

@app.get("/api/result/{roll_number}", response_model=ResultResponse)
def get_result(roll_number: str):
    try:
        # RBSE typically uses POST requests for form submissions
        payload = {'roll_no': roll_number, 'B1': 'Submit'}
        response = requests.post(RBSE_RESULT_URL, data=payload, timeout=10)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Server Timeout: Official site is taking too long to respond.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to official site: {str(e)}")

    html = response.text
    soup = BeautifulSoup(html, 'html.parser')

    # Basic check if roll number not found
    if "Not Found" in html or "Invalid" in html or "Please enter valid" in html:
        raise HTTPException(status_code=404, detail="Roll Number Not Found")

    try:
        # --- PARSING LOGIC ---
        # NOTE: This parsing logic is highly dependent on the exact HTML structure of rajresults.nic.in
        # which changes slightly each year. This is a generalized example based on typical Indian board result tables.
        
        tables = soup.find_all('table')
        
        # Example extraction (pseudo-logic based on typical table structures):
        # Assuming student info is in the second table, and marks are in the third table.
        name = "Unknown Student"
        if len(tables) > 1:
            student_info_rows = tables[1].find_all('tr')
            if len(student_info_rows) > 1:
                tds = student_info_rows[1].find_all('td')
                if len(tds) > 1:
                    name = tds[1].text.strip()
        
        subjects = []
        total_marks = 0
        
        if len(tables) > 2:
            marks_rows = tables[2].find_all('tr')
            for row in marks_rows[1:]: # Skip header row
                tds = row.find_all('td')
                if len(tds) >= 4:
                    subject = tds[0].text.strip()
                    try:
                        theory = int(tds[1].text.strip() or 0)
                        practical = int(tds[2].text.strip() or 0)
                        total = int(tds[3].text.strip() or (theory + practical))
                    except ValueError:
                        continue
                    
                    if subject and "total" not in subject.lower():
                        subjects.append({
                            "subject": subject,
                            "theory": theory,
                            "practical": practical,
                            "total": total
                        })
                        total_marks += total

        percentage = (total_marks / (len(subjects) * 100)) * 100 if subjects else 0.0
        result_status = "FAIL" if "FAIL" in html.upper() else "PASS"

        return {
            "name": name,
            "roll_no": roll_number,
            "subject_wise_marks": subjects,
            "total_marks": total_marks,
            "percentage": round(percentage, 2),
            "result_status": result_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to parse result data. HTML structure might have changed.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
