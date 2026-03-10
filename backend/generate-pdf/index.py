import json
from typing import Dict, Any
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import io
import base64

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Generate PDF catalog with job vacancies
    Args: event - dict with httpMethod, body containing vacancies data
          context - object with request_id attribute
    Returns: HTTP response with base64-encoded PDF
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    vacancies = body_data.get('vacancies', [])
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#1a1a1a',
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor='#2563eb',
        spaceAfter=12,
        spaceBefore=20
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        textColor='#4b5563',
        spaceAfter=8,
        alignment=TA_LEFT
    )
    
    story = []
    
    story.append(Paragraph("Каталог вакансий", title_style))
    story.append(Spacer(1, 0.5*cm))
    
    for idx, vacancy in enumerate(vacancies):
        if idx > 0:
            story.append(PageBreak())
        
        story.append(Paragraph(vacancy.get('title', 'Без названия'), heading_style))
        
        if vacancy.get('salary'):
            story.append(Paragraph(f"<b>Зарплата:</b> {vacancy['salary']}", body_style))
        
        if vacancy.get('location'):
            story.append(Paragraph(f"<b>Локация:</b> {vacancy['location']}", body_style))
        
        if vacancy.get('type'):
            story.append(Paragraph(f"<b>Тип занятости:</b> {vacancy['type']}", body_style))
        
        story.append(Spacer(1, 0.3*cm))
        
        if vacancy.get('description'):
            story.append(Paragraph("<b>Описание:</b>", body_style))
            story.append(Paragraph(vacancy['description'], body_style))
        
        if vacancy.get('requirements'):
            story.append(Spacer(1, 0.2*cm))
            story.append(Paragraph("<b>Требования:</b>", body_style))
            for req in vacancy['requirements']:
                story.append(Paragraph(f"• {req}", body_style))
        
        if vacancy.get('benefits'):
            story.append(Spacer(1, 0.2*cm))
            story.append(Paragraph("<b>Условия:</b>", body_style))
            for benefit in vacancy['benefits']:
                story.append(Paragraph(f"• {benefit}", body_style))
    
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({
            'pdf': pdf_base64,
            'filename': 'catalog.pdf'
        })
    }
