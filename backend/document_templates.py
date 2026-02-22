"""
Document Templates Module for TLS Advocate Portal
Generates legal documents with placeholders, digital signatures, and QR stamps
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
import qrcode
import base64
import uuid
import io
import re
import hashlib

# Create router
templates_router = APIRouter(prefix="/api/templates", tags=["Document Templates"])

# =============== DOCUMENT TEMPLATES ===============

DOCUMENT_TEMPLATES = {
    "power_of_attorney": {
        "name": "Power of Attorney (Wakala)",
        "name_sw": "Hati ya Wakala",
        "category": "authorization",
        "description": "Authorization for legal representation",
        "placeholders": ["client_name", "client_address", "client_id_number", "advocate_name", "roll_number", "firm_name", "matter_description", "date", "witness_name_1", "witness_name_2"],
        "content_en": """
<h1 style="text-align: center;">POWER OF ATTORNEY</h1>
<p style="text-align: center;"><i>(Pursuant to the Advocates Act, Cap 341 R.E. 2019)</i></p>
<hr/>

<p><b>KNOW ALL MEN BY THESE PRESENTS</b> that I, <b>{{client_name}}</b>, of {{client_address}}, holder of National ID/Passport No. <b>{{client_id_number}}</b>, do hereby appoint and constitute <b>{{advocate_name}}</b>, Advocate of the High Court of Tanzania and Subordinate Courts, Roll Number <b>{{roll_number}}</b>, of {{firm_name}}, to be my true and lawful Attorney.</p>

<p><b>WHEREAS</b> I require legal representation in the following matter:</p>
<p style="margin-left: 20px;"><i>{{matter_description}}</i></p>

<p><b>NOW THEREFORE</b>, I do hereby authorize my said Attorney to:</p>
<ol>
<li>Appear on my behalf before any Court, Tribunal, or Authority in the United Republic of Tanzania;</li>
<li>File, sign, and verify all pleadings, applications, and documents as may be necessary;</li>
<li>Engage, instruct, and pay counsel on my behalf;</li>
<li>Receive summons, notices, and other processes;</li>
<li>Negotiate, compromise, and settle any matter in dispute;</li>
<li>Receive and give valid receipts for any monies payable to me;</li>
<li>Do all such acts, deeds, and things as may be necessary in the premises.</li>
</ol>

<p><b>AND I HEREBY</b> ratify and confirm all acts lawfully done by my said Attorney in pursuance of this Power of Attorney.</p>

<p><b>IN WITNESS WHEREOF</b>, I have hereunto set my hand this <b>{{date}}</b>.</p>

<br/><br/>
<table width="100%">
<tr>
<td width="50%" style="text-align: center;">
____________________<br/>
<b>{{client_name}}</b><br/>
(Principal/Donor)
</td>
<td width="50%" style="text-align: center;">
____________________<br/>
<b>{{advocate_name}}</b><br/>
(Advocate/Donee)
</td>
</tr>
</table>

<br/><br/>
<p><b>WITNESSES:</b></p>
<table width="100%">
<tr>
<td width="50%">
1. Name: {{witness_name_1}}<br/>
   Signature: ____________________<br/>
   Date: {{date}}
</td>
<td width="50%">
2. Name: {{witness_name_2}}<br/>
   Signature: ____________________<br/>
   Date: {{date}}
</td>
</tr>
</table>
""",
    },
    
    "affidavit": {
        "name": "Affidavit (Kiapo)",
        "name_sw": "Hati ya Kiapo",
        "category": "sworn_statement",
        "description": "Sworn statement template",
        "placeholders": ["client_name", "client_address", "client_id_number", "client_occupation", "case_number", "court_name", "affidavit_content", "date", "commissioner_name"],
        "content_en": """
<h1 style="text-align: center;">IN THE {{court_name}}</h1>
<p style="text-align: center;"><b>{{case_number}}</b></p>
<hr/>
<h2 style="text-align: center;">AFFIDAVIT</h2>
<p style="text-align: center;"><i>(Made pursuant to Order XIX of the Civil Procedure Code, Cap. 33 R.E. 2019)</i></p>

<p>I, <b>{{client_name}}</b>, of {{client_address}}, holder of National ID/Passport No. <b>{{client_id_number}}</b>, {{client_occupation}} by profession, do hereby make oath/solemnly affirm and state as follows:</p>

<ol>
{{affidavit_content}}
</ol>

<p><b>THAT</b> what is stated hereinabove is true to the best of my knowledge, information, and belief.</p>

<br/><br/>
<table width="100%">
<tr>
<td width="60%">
<b>SWORN/AFFIRMED</b> at ________________<br/>
this <b>{{date}}</b><br/><br/>
Before me:<br/><br/>
____________________<br/>
<b>{{commissioner_name}}</b><br/>
Commissioner for Oaths/Notary Public
</td>
<td width="40%" style="text-align: center;">
<br/><br/><br/>
____________________<br/>
<b>{{client_name}}</b><br/>
(Deponent)
</td>
</tr>
</table>
""",
    },
    
    "legal_notice": {
        "name": "Legal Notice",
        "name_sw": "Notisi ya Kisheria",
        "category": "notice",
        "description": "Formal notice to opposing party",
        "placeholders": ["client_name", "client_address", "advocate_name", "roll_number", "firm_name", "firm_address", "recipient_name", "recipient_address", "notice_subject", "notice_content", "response_days", "date"],
        "content_en": """
<p style="text-align: right;"><b>{{firm_name}}</b><br/>
{{firm_address}}<br/>
Tel: _______________<br/>
Email: _______________<br/>
Date: {{date}}</p>

<p><b>WITHOUT PREJUDICE</b></p>

<p><b>TO:</b><br/>
{{recipient_name}}<br/>
{{recipient_address}}</p>

<p><b>RE: {{notice_subject}}</b></p>

<p>Dear Sir/Madam,</p>

<p>We are Advocates acting for and on behalf of our client, <b>{{client_name}}</b>, of {{client_address}}, on whose instructions we address you as follows:</p>

{{notice_content}}

<p>TAKE NOTICE that unless you comply with the above demands within <b>{{response_days}} days</b> from the date of receipt of this notice, our client shall have no alternative but to institute legal proceedings against you without further reference to you, in which event you shall be liable for all costs incurred on an advocate-client basis.</p>

<p>Govern yourself accordingly.</p>

<br/><br/>
<p>Yours faithfully,</p>
<br/><br/>
<p>____________________<br/>
<b>{{advocate_name}}</b><br/>
Advocate<br/>
Roll No: {{roll_number}}<br/>
For: {{firm_name}}</p>

<p style="font-size: 10px;"><i>cc: Client</i></p>
""",
    },
    
    "service_agreement": {
        "name": "Legal Service Agreement",
        "name_sw": "Mkataba wa Huduma za Kisheria",
        "category": "contract",
        "description": "Client engagement letter",
        "placeholders": ["client_name", "client_address", "client_id_number", "advocate_name", "roll_number", "firm_name", "firm_address", "matter_description", "fee_structure", "retainer_amount", "date"],
        "content_en": """
<h1 style="text-align: center;">LEGAL SERVICE AGREEMENT</h1>
<p style="text-align: center;"><i>(Client Engagement Letter)</i></p>
<hr/>

<p><b>THIS AGREEMENT</b> is made this <b>{{date}}</b></p>

<p><b>BETWEEN:</b></p>

<p><b>{{firm_name}}</b>, Advocates, of {{firm_address}}, represented by <b>{{advocate_name}}</b>, Advocate, Roll Number {{roll_number}} (hereinafter referred to as "the Advocate")</p>

<p style="text-align: center;"><b>AND</b></p>

<p><b>{{client_name}}</b>, of {{client_address}}, holder of ID/Passport No. {{client_id_number}} (hereinafter referred to as "the Client")</p>

<p><b>WHEREAS</b> the Client requires legal services in connection with:</p>
<p style="margin-left: 20px;"><i>{{matter_description}}</i></p>

<p><b>NOW THEREFORE IT IS AGREED AS FOLLOWS:</b></p>

<ol>
<li><b>SCOPE OF SERVICES:</b> The Advocate shall provide legal services in connection with the matter described above.</li>

<li><b>FEES AND BILLING:</b><br/>
{{fee_structure}}</li>

<li><b>RETAINER:</b> The Client shall pay an initial retainer of <b>TZS {{retainer_amount}}</b> upon execution of this Agreement.</li>

<li><b>DISBURSEMENTS:</b> The Client shall be responsible for all disbursements including court fees, travel expenses, and other out-of-pocket expenses.</li>

<li><b>CONFIDENTIALITY:</b> The Advocate shall maintain strict confidentiality of all information disclosed by the Client.</li>

<li><b>TERMINATION:</b> Either party may terminate this Agreement upon 14 days written notice.</li>

<li><b>GOVERNING LAW:</b> This Agreement shall be governed by the laws of the United Republic of Tanzania.</li>
</ol>

<br/><br/>
<table width="100%">
<tr>
<td width="50%" style="text-align: center;">
____________________<br/>
<b>{{advocate_name}}</b><br/>
For: {{firm_name}}<br/>
Date: {{date}}
</td>
<td width="50%" style="text-align: center;">
____________________<br/>
<b>{{client_name}}</b><br/>
(Client)<br/>
Date: {{date}}
</td>
</tr>
</table>
""",
    },
    
    "court_filing": {
        "name": "Court Filing Cover Sheet",
        "name_sw": "Jalada la Maombi ya Mahakama",
        "category": "court",
        "description": "Standard court submission form",
        "placeholders": ["case_number", "court_name", "plaintiff_name", "defendant_name", "document_type", "advocate_name", "roll_number", "firm_name", "firm_address", "date", "filing_fee"],
        "content_en": """
<h1 style="text-align: center;">IN THE {{court_name}}</h1>
<p style="text-align: center;"><b>{{case_number}}</b></p>
<hr/>

<table width="100%" style="border: 1px solid black;">
<tr>
<td width="50%" style="border-right: 1px solid black; padding: 10px;">
<b>PLAINTIFF(S):</b><br/>
{{plaintiff_name}}
</td>
<td width="50%" style="padding: 10px;">
<b>DEFENDANT(S):</b><br/>
{{defendant_name}}
</td>
</tr>
</table>

<br/>
<h2 style="text-align: center;">FILING COVER SHEET</h2>

<table width="100%">
<tr><td><b>Document Type:</b></td><td>{{document_type}}</td></tr>
<tr><td><b>Date of Filing:</b></td><td>{{date}}</td></tr>
<tr><td><b>Filing Fee Paid:</b></td><td>TZS {{filing_fee}}</td></tr>
</table>

<br/>
<p><b>FILED BY:</b></p>
<p>{{advocate_name}}<br/>
Advocate<br/>
Roll No: {{roll_number}}<br/>
{{firm_name}}<br/>
{{firm_address}}</p>

<br/>
<p><b>FOR COURT USE ONLY:</b></p>
<table width="100%" style="border: 1px solid black;">
<tr>
<td style="padding: 10px;">
Received by: ____________________<br/><br/>
Date: ____________________<br/><br/>
Receipt No: ____________________
</td>
</tr>
</table>
""",
    },
    
    "demand_letter": {
        "name": "Demand Letter",
        "name_sw": "Barua ya Madai",
        "category": "notice",
        "description": "Payment/action demand",
        "placeholders": ["client_name", "advocate_name", "roll_number", "firm_name", "firm_address", "debtor_name", "debtor_address", "debt_amount", "debt_description", "original_due_date", "response_days", "date"],
        "content_en": """
<p style="text-align: right;"><b>{{firm_name}}</b><br/>
{{firm_address}}<br/>
Date: {{date}}</p>

<p><b>BY REGISTERED POST & EMAIL</b></p>

<p><b>TO:</b><br/>
{{debtor_name}}<br/>
{{debtor_address}}</p>

<p><b>RE: DEMAND FOR PAYMENT OF TZS {{debt_amount}}</b></p>

<p>Dear Sir/Madam,</p>

<p>We act for <b>{{client_name}}</b> (hereinafter "our Client") in whose behalf and upon whose instructions we write.</p>

<p>Our Client instructs us that you are indebted to them in the sum of <b>TZS {{debt_amount}}</b> (Tanzania Shillings {{debt_amount}} only) being:</p>

<p style="margin-left: 20px;">{{debt_description}}</p>

<p>The said amount was due and payable on <b>{{original_due_date}}</b>, and despite repeated demands, you have failed, refused, and/or neglected to settle the same.</p>

<p><b>TAKE NOTICE</b> that unless the said sum of <b>TZS {{debt_amount}}</b> together with interest thereon and costs of this letter is paid to our office within <b>{{response_days}} days</b> from the date hereof, our Client shall institute legal proceedings against you for recovery of the same together with:</p>

<ol>
<li>Interest at the commercial rate from the due date until payment in full;</li>
<li>Costs of this letter;</li>
<li>Costs of the suit on advocate-client basis;</li>
<li>Any other relief the Court may deem just to grant.</li>
</ol>

<p>Govern yourself accordingly.</p>

<br/>
<p>Yours faithfully,</p>
<br/><br/>
<p>____________________<br/>
<b>{{advocate_name}}</b><br/>
Advocate, Roll No: {{roll_number}}<br/>
For: {{firm_name}}</p>
""",
    },
    
    "witness_statement": {
        "name": "Witness Statement",
        "name_sw": "Taarifa ya Shahidi",
        "category": "court",
        "description": "Template for witness depositions",
        "placeholders": ["witness_name", "witness_address", "witness_id_number", "witness_occupation", "case_number", "court_name", "plaintiff_name", "defendant_name", "statement_content", "date"],
        "content_en": """
<h1 style="text-align: center;">IN THE {{court_name}}</h1>
<p style="text-align: center;"><b>{{case_number}}</b></p>
<hr/>

<table width="100%">
<tr>
<td><b>{{plaintiff_name}}</b></td>
<td style="text-align: right;">PLAINTIFF</td>
</tr>
<tr>
<td colspan="2" style="text-align: center;"><b>VERSUS</b></td>
</tr>
<tr>
<td><b>{{defendant_name}}</b></td>
<td style="text-align: right;">DEFENDANT</td>
</tr>
</table>

<hr/>
<h2 style="text-align: center;">WITNESS STATEMENT</h2>

<p>I, <b>{{witness_name}}</b>, of {{witness_address}}, holder of ID/Passport No. {{witness_id_number}}, {{witness_occupation}} by occupation, state as follows:</p>

<ol>
{{statement_content}}
</ol>

<p>I believe that the facts stated in this witness statement are true.</p>

<br/><br/>
<table width="100%">
<tr>
<td width="60%">
<b>Signed:</b> ____________________<br/><br/>
<b>Name:</b> {{witness_name}}<br/><br/>
<b>Date:</b> {{date}}
</td>
<td width="40%">
</td>
</tr>
</table>
""",
    },
    
    "sale_agreement": {
        "name": "Sale Agreement",
        "name_sw": "Mkataba wa Mauzo",
        "category": "contract",
        "description": "Property/asset sale contract",
        "placeholders": ["seller_name", "seller_address", "seller_id_number", "buyer_name", "buyer_address", "buyer_id_number", "property_description", "sale_price", "deposit_amount", "completion_date", "date", "witness_name_1", "witness_name_2"],
        "content_en": """
<h1 style="text-align: center;">AGREEMENT FOR SALE</h1>
<hr/>

<p><b>THIS AGREEMENT</b> is made this <b>{{date}}</b></p>

<p><b>BETWEEN:</b></p>

<p><b>{{seller_name}}</b>, of {{seller_address}}, holder of ID/Passport No. {{seller_id_number}} (hereinafter called "the Seller")</p>

<p style="text-align: center;"><b>AND</b></p>

<p><b>{{buyer_name}}</b>, of {{buyer_address}}, holder of ID/Passport No. {{buyer_id_number}} (hereinafter called "the Buyer")</p>

<p><b>WHEREAS</b> the Seller is the owner of the property described below and has agreed to sell the same to the Buyer:</p>

<p style="margin-left: 20px; border: 1px solid black; padding: 10px;">
<b>PROPERTY DESCRIPTION:</b><br/>
{{property_description}}
</p>

<p><b>NOW IT IS HEREBY AGREED AS FOLLOWS:</b></p>

<ol>
<li><b>SALE PRICE:</b> The Seller agrees to sell and the Buyer agrees to purchase the property for the sum of <b>TZS {{sale_price}}</b>.</li>

<li><b>DEPOSIT:</b> The Buyer shall pay a deposit of <b>TZS {{deposit_amount}}</b> upon signing this Agreement.</li>

<li><b>COMPLETION:</b> The sale shall be completed on or before <b>{{completion_date}}</b>.</li>

<li><b>VACANT POSSESSION:</b> The Seller shall deliver vacant possession upon completion.</li>

<li><b>TITLE:</b> The Seller warrants that they have good and marketable title to the property.</li>

<li><b>ENCUMBRANCES:</b> The property is sold free from all encumbrances except as disclosed.</li>

<li><b>DEFAULT:</b> If the Buyer defaults, the deposit shall be forfeited. If the Seller defaults, the deposit shall be refunded in double.</li>

<li><b>GOVERNING LAW:</b> This Agreement shall be governed by the laws of the United Republic of Tanzania.</li>
</ol>

<br/>
<table width="100%">
<tr>
<td width="50%" style="text-align: center;">
____________________<br/>
<b>{{seller_name}}</b><br/>
(Seller)
</td>
<td width="50%" style="text-align: center;">
____________________<br/>
<b>{{buyer_name}}</b><br/>
(Buyer)
</td>
</tr>
</table>

<br/>
<p><b>WITNESSES:</b></p>
<table width="100%">
<tr>
<td width="50%">1. {{witness_name_1}}<br/>Signature: ____________________</td>
<td width="50%">2. {{witness_name_2}}<br/>Signature: ____________________</td>
</tr>
</table>
""",
    },
    
    "lease_agreement": {
        "name": "Lease Agreement",
        "name_sw": "Mkataba wa Upangaji",
        "category": "contract",
        "description": "Rental contract template",
        "placeholders": ["landlord_name", "landlord_address", "landlord_id_number", "tenant_name", "tenant_address", "tenant_id_number", "property_address", "monthly_rent", "security_deposit", "lease_start_date", "lease_end_date", "date", "witness_name_1", "witness_name_2"],
        "content_en": """
<h1 style="text-align: center;">LEASE AGREEMENT</h1>
<hr/>

<p><b>THIS LEASE AGREEMENT</b> is made this <b>{{date}}</b></p>

<p><b>BETWEEN:</b></p>

<p><b>{{landlord_name}}</b>, of {{landlord_address}}, ID No. {{landlord_id_number}} (hereinafter called "the Landlord")</p>

<p style="text-align: center;"><b>AND</b></p>

<p><b>{{tenant_name}}</b>, of {{tenant_address}}, ID No. {{tenant_id_number}} (hereinafter called "the Tenant")</p>

<p><b>PROPERTY:</b> {{property_address}}</p>

<p><b>THE PARTIES AGREE AS FOLLOWS:</b></p>

<ol>
<li><b>TERM:</b> The lease shall commence on <b>{{lease_start_date}}</b> and expire on <b>{{lease_end_date}}</b>.</li>

<li><b>RENT:</b> The Tenant shall pay monthly rent of <b>TZS {{monthly_rent}}</b>, payable in advance on the 1st day of each month.</li>

<li><b>SECURITY DEPOSIT:</b> The Tenant shall pay a security deposit of <b>TZS {{security_deposit}}</b>.</li>

<li><b>USE:</b> The premises shall be used for residential purposes only.</li>

<li><b>UTILITIES:</b> The Tenant shall be responsible for all utility charges.</li>

<li><b>MAINTENANCE:</b> The Tenant shall maintain the premises in good condition.</li>

<li><b>ALTERATIONS:</b> No alterations shall be made without the Landlord's written consent.</li>

<li><b>SUBLETTING:</b> The Tenant shall not sublet without the Landlord's written consent.</li>

<li><b>TERMINATION:</b> Either party may terminate with 30 days written notice.</li>

<li><b>GOVERNING LAW:</b> This Agreement shall be governed by the laws of the United Republic of Tanzania.</li>
</ol>

<br/>
<table width="100%">
<tr>
<td width="50%" style="text-align: center;">
____________________<br/>
<b>{{landlord_name}}</b><br/>
(Landlord)
</td>
<td width="50%" style="text-align: center;">
____________________<br/>
<b>{{tenant_name}}</b><br/>
(Tenant)
</td>
</tr>
</table>

<br/>
<p><b>WITNESSES:</b></p>
<table width="100%">
<tr>
<td width="50%">1. {{witness_name_1}}<br/>Signature: ____________________</td>
<td width="50%">2. {{witness_name_2}}<br/>Signature: ____________________</td>
</tr>
</table>
""",
    },
    
    "will_testament": {
        "name": "Last Will and Testament",
        "name_sw": "Wosia",
        "category": "estate",
        "description": "Last will template",
        "placeholders": ["testator_name", "testator_address", "testator_id_number", "testator_occupation", "executor_name", "executor_address", "beneficiaries_content", "special_bequests", "date", "witness_name_1", "witness_address_1", "witness_name_2", "witness_address_2"],
        "content_en": """
<h1 style="text-align: center;">LAST WILL AND TESTAMENT</h1>
<hr/>

<p>I, <b>{{testator_name}}</b>, of {{testator_address}}, holder of ID/Passport No. {{testator_id_number}}, {{testator_occupation}} by occupation, being of sound mind and memory, do hereby declare this to be my Last Will and Testament, revoking all previous Wills and Codicils made by me.</p>

<h3>1. EXECUTOR</h3>
<p>I appoint <b>{{executor_name}}</b>, of {{executor_address}}, to be the Executor of this my Will.</p>

<h3>2. DEBTS AND EXPENSES</h3>
<p>I direct my Executor to pay all my just debts, funeral expenses, and expenses of administration.</p>

<h3>3. DISTRIBUTION OF ESTATE</h3>
{{beneficiaries_content}}

<h3>4. SPECIAL BEQUESTS</h3>
{{special_bequests}}

<h3>5. RESIDUARY ESTATE</h3>
<p>I give all the rest, residue, and remainder of my estate to be distributed as directed above.</p>

<p><b>IN WITNESS WHEREOF</b>, I have hereunto set my hand this <b>{{date}}</b>.</p>

<br/><br/>
<p style="text-align: center;">
____________________<br/>
<b>{{testator_name}}</b><br/>
(Testator)
</p>

<br/>
<p><b>WITNESSES:</b></p>
<p>We declare that the person who signed this Will, or asked another to sign for them, did so in our presence. We believe this person to be of sound mind. Each of us, in the presence of the testator and in the presence of each other, have signed our names as witnesses on this {{date}}.</p>

<table width="100%">
<tr>
<td width="50%">
<b>Witness 1:</b><br/>
Name: {{witness_name_1}}<br/>
Address: {{witness_address_1}}<br/><br/>
Signature: ____________________
</td>
<td width="50%">
<b>Witness 2:</b><br/>
Name: {{witness_name_2}}<br/>
Address: {{witness_address_2}}<br/><br/>
Signature: ____________________
</td>
</tr>
</table>
""",
    },
}

# =============== PYDANTIC MODELS ===============

class GenerateDocumentRequest(BaseModel):
    template_id: str
    data: Dict[str, str]
    include_signature: bool = False
    include_qr_stamp: bool = False
    language: str = "en"  # en or sw
    save_to_vault: bool = True  # Auto-save to vault
    client_id: Optional[str] = None  # Link to client
    case_id: Optional[str] = None  # Link to case
    folder: str = "Generated Documents"  # Vault folder

class SavedDocument(BaseModel):
    name: str
    template_id: str
    data: Dict[str, str]
    include_signature: bool = False
    include_qr_stamp: bool = False
    client_id: Optional[str] = None
    case_id: Optional[str] = None

class ShareDocumentRequest(BaseModel):
    document_id: str
    share_via: str = "email"  # email, link, whatsapp
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    message: Optional[str] = None


# =============== HELPER FUNCTIONS ===============

def generate_qr_code_image(data: str, size: int = 100) -> io.BytesIO:
    """Generate QR code as image bytes"""
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def create_unified_stamp_section(qr_data: str, verification_id: str, user: dict, styles) -> list:
    """Create a unified TLS stamp section that matches the frontend design"""
    from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line
    from reportlab.graphics import renderPDF
    
    elements = []
    
    # Generate QR code
    qr_buffer = generate_qr_code_image(qr_data, 80)
    qr_img = Image(qr_buffer, width=1.2*inch, height=1.2*inch)
    
    # TLS brand color (blue)
    tls_blue = colors.Color(0.231, 0.510, 0.965)  # #3B82F6
    
    # Create styled stamp paragraph
    stamp_title_style = ParagraphStyle(
        'StampTitle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=tls_blue,
        alignment=TA_CENTER
    )
    
    stamp_info_style = ParagraphStyle(
        'StampInfo',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica',
        textColor=colors.black,
        alignment=TA_CENTER,
        leading=10
    )
    
    # Build stamp content
    title_para = Paragraph("★ TLS VERIFIED ★", stamp_title_style)
    
    info_text = f"""
    <font color="#3B82F6"><b>ID: {verification_id}</b></font><br/>
    <font size="7">Generated: {datetime.now().strftime('%d %b %Y, %H:%M')}</font><br/>
    <font size="7">{user.get('full_name', 'N/A')}</font><br/>
    <font size="7">Roll No: {user.get('roll_number', 'N/A')}</font>
    """
    info_para = Paragraph(info_text, stamp_info_style)
    
    # Create inner table for stamp content (QR left, text right)
    inner_table = Table([
        [qr_img, info_para]
    ], colWidths=[1.5*inch, 2.5*inch])
    
    inner_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('ALIGN', (1, 0), (1, 0), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    # Create outer stamp table with TLS styling
    stamp_table = Table([
        [title_para],
        [inner_table]
    ], colWidths=[4.2*inch])
    
    stamp_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 2, tls_blue),
        ('LINEABOVE', (0, 1), (-1, 1), 1, tls_blue),
        ('BACKGROUND', (0, 0), (-1, -1), colors.Color(0.98, 0.98, 1.0)),  # Very light blue
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(Spacer(1, 0.5*cm))
    elements.append(stamp_table)
    
    return elements, verification_id


def fill_placeholders(template: str, data: Dict[str, str]) -> str:
    """Replace {{placeholder}} with actual values"""
    result = template
    for key, value in data.items():
        result = result.replace(f"{{{{{key}}}}}", str(value) if value else "_______________")
    # Replace any remaining placeholders with blank
    result = re.sub(r'\{\{[^}]+\}\}', '_______________', result)
    return result


# =============== ROUTE FACTORY ===============

def create_templates_routes(db, get_current_user):
    """Factory function to create template routes"""
    
    @templates_router.get("/list")
    async def list_templates():
        """Get all available document templates"""
        templates = []
        for template_id, template in DOCUMENT_TEMPLATES.items():
            templates.append({
                "id": template_id,
                "name": template["name"],
                "name_sw": template.get("name_sw", template["name"]),
                "category": template["category"],
                "description": template["description"],
                "placeholders": template["placeholders"]
            })
        return {"templates": templates}
    
    @templates_router.get("/history")
    async def get_document_history(
        limit: int = Query(default=50, le=200),
        user: dict = Depends(get_current_user)
    ):
        """Get generated document history"""
        documents = await db.generated_documents.find(
            {"advocate_id": user["id"]},
            {"_id": 0}
        ).sort("generated_at", -1).to_list(limit)
        
        return {"documents": documents, "total": len(documents)}
    
    @templates_router.get("/{template_id}")
    async def get_template(template_id: str):
        """Get a specific template with its content"""
        if template_id not in DOCUMENT_TEMPLATES:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = DOCUMENT_TEMPLATES[template_id]
        return {
            "id": template_id,
            "name": template["name"],
            "name_sw": template.get("name_sw", template["name"]),
            "category": template["category"],
            "description": template["description"],
            "placeholders": template["placeholders"],
            "content_preview": template["content_en"][:500] + "..."
        }
    
    @templates_router.post("/generate")
    async def generate_document(request: GenerateDocumentRequest, user: dict = Depends(get_current_user)):
        """Generate a PDF document from template"""
        if request.template_id not in DOCUMENT_TEMPLATES:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = DOCUMENT_TEMPLATES[request.template_id]
        
        # Add advocate info to data
        data = {**request.data}
        if "advocate_name" not in data or not data["advocate_name"]:
            data["advocate_name"] = user.get("full_name", "")
        if "roll_number" not in data or not data["roll_number"]:
            data["roll_number"] = user.get("roll_number", "")
        if "date" not in data or not data["date"]:
            data["date"] = datetime.now().strftime("%d %B %Y")
        
        # Fill placeholders
        content = fill_placeholders(template["content_en"], data)
        
        # Generate PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='DocumentTitle', fontSize=16, alignment=TA_CENTER, spaceAfter=20, fontName='Helvetica-Bold'))
        styles.add(ParagraphStyle(name='DocumentBody', fontSize=11, alignment=TA_JUSTIFY, spaceAfter=10, leading=14))
        styles.add(ParagraphStyle(name='DocumentCenter', fontSize=11, alignment=TA_CENTER, spaceAfter=10))
        
        story = []
        
        # Header with firm letterhead (if applicable)
        if request.include_signature or request.include_qr_stamp:
            header_text = f"<b>{user.get('full_name', 'ADVOCATE')}</b><br/>Advocate of the High Court of Tanzania<br/>Roll No: {user.get('roll_number', 'N/A')}"
            story.append(Paragraph(header_text, styles['DocumentCenter']))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
            story.append(Spacer(1, 0.5*cm))
        
        # Parse HTML content and convert to reportlab elements
        # Simple HTML to paragraphs conversion
        content = content.replace('<h1', '<para alignment="center" fontSize="16" fontName="Helvetica-Bold"').replace('</h1>', '</para>')
        content = content.replace('<h2', '<para alignment="center" fontSize="14" fontName="Helvetica-Bold"').replace('</h2>', '</para>')
        content = content.replace('<h3', '<para fontSize="12" fontName="Helvetica-Bold"').replace('</h3>', '</para>')
        content = content.replace('<hr/>', '')
        content = content.replace('<br/>', '<br/>')
        
        # Split by paragraphs and add to story
        paragraphs = re.split(r'<p[^>]*>|</p>', content)
        for para in paragraphs:
            para = para.strip()
            if para and para not in ['<hr/>']:
                # Clean up HTML tags for simple rendering
                para = re.sub(r'style="[^"]*"', '', para)
                para = para.replace('<table', '<para').replace('</table>', '</para>')
                para = para.replace('<tr>', '').replace('</tr>', '<br/>')
                para = para.replace('<td>', '').replace('</td>', '  |  ')
                try:
                    story.append(Paragraph(para, styles['DocumentBody']))
                    story.append(Spacer(1, 0.2*cm))
                except Exception:
                    # Skip problematic paragraphs
                    pass
        
        # Add QR stamp if requested (using unified design)
        if request.include_qr_stamp:
            story.append(Spacer(1, 0.8*cm))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.231, 0.510, 0.965)))
            
            verification_id = f"TLS-DOC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            qr_data = f"https://tls.or.tz/verify?doc={verification_id}"
            stamp_elements, verification_id = create_unified_stamp_section(qr_data, verification_id, user, styles)
            story.extend(stamp_elements)
        
        # Add digital signature if requested
        if request.include_signature:
            story.append(Spacer(1, 0.5*cm))
            tls_blue = colors.Color(0.231, 0.510, 0.965)
            sig_style = ParagraphStyle(
                name='Signature', 
                fontSize=9, 
                alignment=TA_RIGHT, 
                borderColor=tls_blue, 
                borderWidth=1, 
                borderPadding=5,
                textColor=colors.black
            )
            sig_text = f"""
            <font color="#3B82F6"><b>DIGITALLY SIGNED</b></font><br/>
            {user.get('full_name', 'ADVOCATE')}<br/>
            Roll No: {user.get('roll_number', 'N/A')}<br/>
            Date: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br/>
            <font color="#3B82F6">Tanganyika Law Society</font>
            """
            story.append(Paragraph(sig_text, sig_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Save document record
        doc_id = str(uuid.uuid4())
        verification_id = f"TLS-DOC-{datetime.now().strftime('%Y%m%d')}-{doc_id[:8].upper()}"
        pdf_content = buffer.read()
        buffer.seek(0)
        
        doc_record = {
            "id": doc_id,
            "advocate_id": user["id"],
            "template_id": request.template_id,
            "template_name": template["name"],
            "data": data,
            "include_signature": request.include_signature,
            "include_qr_stamp": request.include_qr_stamp,
            "verification_id": verification_id,
            "client_id": request.client_id,
            "case_id": request.case_id,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.generated_documents.insert_one(doc_record)
        
        # Auto-save to vault if requested
        if request.save_to_vault:
            import hashlib
            vault_doc = {
                "id": str(uuid.uuid4()),
                "advocate_id": user["id"],
                "name": f"{template['name']} - {datetime.now().strftime('%Y-%m-%d')}",
                "original_filename": f"{request.template_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                "description": f"Generated from {template['name']} template",
                "folder": request.folder,
                "tags": ["generated", template["category"], request.template_id],
                "client_id": request.client_id,
                "case_id": request.case_id,
                "file_type": "application/pdf",
                "file_size": len(pdf_content),
                "file_hash": hashlib.sha256(pdf_content).hexdigest(),
                "file_data": base64.b64encode(pdf_content).decode('utf-8'),
                "generated_doc_id": doc_id,
                "verification_id": verification_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.vault_documents.insert_one(vault_doc)
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={request.template_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                "X-Document-Id": doc_id,
                "X-Verification-Id": verification_id
            }
        )
    
    @templates_router.post("/preview")
    async def preview_document(request: GenerateDocumentRequest, user: dict = Depends(get_current_user)):
        """Preview document content (HTML)"""
        if request.template_id not in DOCUMENT_TEMPLATES:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = DOCUMENT_TEMPLATES[request.template_id]
        
        # Add advocate info to data
        data = {**request.data}
        if "advocate_name" not in data or not data["advocate_name"]:
            data["advocate_name"] = user.get("full_name", "")
        if "roll_number" not in data or not data["roll_number"]:
            data["roll_number"] = user.get("roll_number", "")
        if "date" not in data or not data["date"]:
            data["date"] = datetime.now().strftime("%d %B %Y")
        
        # Fill placeholders
        content = fill_placeholders(template["content_en"], data)
        
        return {
            "template_name": template["name"],
            "content": content,
            "filled_data": data
        }
    
    # =============== CUSTOM TEMPLATE GENERATION ===============
    
    class CustomTemplateGenerateRequest(BaseModel):
        template_id: str  # Custom template ID from practice/templates
        data: Dict[str, str]
        include_signature: bool = False
        include_qr_stamp: bool = False
        save_to_vault: bool = True
        client_id: Optional[str] = None
        case_id: Optional[str] = None
        folder: str = "Generated Documents"
    
    @templates_router.post("/custom/preview")
    async def preview_custom_template(request: CustomTemplateGenerateRequest, user: dict = Depends(get_current_user)):
        """Preview a custom template with filled data"""
        # Fetch the custom template
        template = await db.templates.find_one(
            {"id": request.template_id},
            {"_id": 0}
        )
        if not template:
            raise HTTPException(status_code=404, detail="Custom template not found")
        
        # Check ownership or public access
        if template.get("advocate_id") != user["id"] and not template.get("is_public"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Fill placeholders in content
        content = template.get("content", "")
        data = {**request.data}
        
        # Add default values
        if "advocate_name" not in data:
            data["advocate_name"] = user.get("full_name", "")
        if "date" not in data:
            data["date"] = datetime.now().strftime("%d %B %Y")
        
        for key, value in data.items():
            content = content.replace(f"{{{{{key}}}}}", str(value))
        
        return {
            "template_name": template["name"],
            "content": content,
            "filled_data": data
        }
    
    @templates_router.post("/custom/generate")
    async def generate_custom_template(request: CustomTemplateGenerateRequest, user: dict = Depends(get_current_user)):
        """Generate PDF from a custom template"""
        # Fetch the custom template
        template = await db.templates.find_one(
            {"id": request.template_id},
            {"_id": 0}
        )
        if not template:
            raise HTTPException(status_code=404, detail="Custom template not found")
        
        # Check ownership or public access
        if template.get("advocate_id") != user["id"] and not template.get("is_public"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Fill placeholders
        content = template.get("content", "")
        data = {**request.data}
        
        # Add default values
        if "advocate_name" not in data:
            data["advocate_name"] = user.get("full_name", "")
        if "date" not in data:
            data["date"] = datetime.now().strftime("%d %B %Y")
        
        for key, value in data.items():
            content = content.replace(f"{{{{{key}}}}}", str(value))
        
        # Generate PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=1*inch,
            bottomMargin=1*inch,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch
        )
        
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=16,
            spaceAfter=20,
            alignment=1
        )
        story.append(Paragraph(template["name"], title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Content - parse HTML-like content
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=11,
            leading=16,
            alignment=4
        )
        
        # Split content by paragraphs and process
        paragraphs = content.split('\n\n')
        for para in paragraphs:
            if para.strip():
                # Clean up and format
                para = para.replace('\n', '<br/>')
                story.append(Paragraph(para, body_style))
                story.append(Spacer(1, 0.2*inch))
        
        # Add signature if requested
        if request.include_signature:
            story.append(Spacer(1, 0.5*inch))
            sig_style = ParagraphStyle('Signature', parent=styles['Normal'], fontSize=10)
            story.append(Paragraph("_" * 40, sig_style))
            story.append(Paragraph(f"<b>{user.get('full_name', 'Advocate')}</b>", sig_style))
            if user.get('roll_number'):
                story.append(Paragraph(f"Roll No: {user.get('roll_number')}", sig_style))
        
        # Add QR stamp if requested (using unified design)
        verification_id = None
        if request.include_qr_stamp:
            story.append(Spacer(1, 0.5*inch))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.231, 0.510, 0.965)))
            
            verification_id = f"TLS-CUSTOM-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            qr_data = f"https://tls.or.tz/verify?doc={verification_id}"
            stamp_elements, verification_id = create_unified_stamp_section(qr_data, verification_id, user, styles)
            story.extend(stamp_elements)
        
        # Build PDF
        doc.build(story)
        
        buffer.seek(0)
        pdf_content = buffer.read()
        
        # Save document record
        doc_id = str(uuid.uuid4())
        doc_record = {
            "id": doc_id,
            "advocate_id": user["id"],
            "template_id": f"custom:{request.template_id}",
            "template_name": template["name"],
            "data": data,
            "include_signature": request.include_signature,
            "include_qr_stamp": request.include_qr_stamp,
            "verification_id": verification_id,
            "client_id": request.client_id,
            "case_id": request.case_id,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.generated_documents.insert_one(doc_record)
        
        # Auto-save to vault
        if request.save_to_vault:
            vault_doc = {
                "id": str(uuid.uuid4()),
                "advocate_id": user["id"],
                "name": f"{template['name']} - {datetime.now().strftime('%Y-%m-%d')}",
                "original_filename": f"custom_{request.template_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                "description": f"Generated from custom template: {template['name']}",
                "folder": request.folder,
                "tags": ["generated", "custom", template.get("category", "other")],
                "client_id": request.client_id,
                "case_id": request.case_id,
                "file_type": "application/pdf",
                "file_size": len(pdf_content),
                "file_hash": hashlib.sha256(pdf_content).hexdigest(),
                "file_data": base64.b64encode(pdf_content).decode('utf-8'),
                "generated_doc_id": doc_id,
                "verification_id": verification_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.vault_documents.insert_one(vault_doc)
        
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=custom_{request.template_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                "X-Document-Id": doc_id,
                "X-Verification-Id": verification_id or ""
            }
        )
    
    @templates_router.post("/share")
    async def share_document(request: ShareDocumentRequest, user: dict = Depends(get_current_user)):
        """Share a generated document"""
        # Find the document
        doc = await db.generated_documents.find_one(
            {"id": request.document_id, "advocate_id": user["id"]},
            {"_id": 0}
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get vault document for the PDF
        vault_doc = await db.vault_documents.find_one(
            {"generated_doc_id": request.document_id, "advocate_id": user["id"]}
        )
        
        share_record = {
            "id": str(uuid.uuid4()),
            "document_id": request.document_id,
            "advocate_id": user["id"],
            "share_via": request.share_via,
            "recipient_email": request.recipient_email,
            "recipient_phone": request.recipient_phone,
            "message": request.message,
            "verification_id": doc.get("verification_id"),
            "shared_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Generate a secure share link
        share_token = str(uuid.uuid4())
        share_record["share_token"] = share_token
        share_record["share_link"] = f"https://tls.or.tz/shared/{share_token}"
        
        await db.document_shares.insert_one(share_record)
        
        # TODO: If email sharing is requested, send via Resend
        # For now, return the share link
        
        return {
            "success": True,
            "share_link": share_record["share_link"],
            "share_token": share_token,
            "verification_id": doc.get("verification_id"),
            "message": f"Document ready to share via {request.share_via}"
        }
    
    @templates_router.get("/shared/{share_token}")
    async def get_shared_document(share_token: str):
        """Public endpoint to view/download a shared document"""
        share_record = await db.document_shares.find_one(
            {"share_token": share_token},
            {"_id": 0}
        )
        if not share_record:
            raise HTTPException(status_code=404, detail="Shared document not found or link expired")
        
        # Get the vault document
        vault_doc = await db.vault_documents.find_one(
            {"generated_doc_id": share_record["document_id"]}
        )
        if not vault_doc:
            raise HTTPException(status_code=404, detail="Document file not found")
        
        # Return document info (not the file itself for security - user must click download)
        return {
            "document_name": vault_doc.get("name"),
            "verification_id": share_record.get("verification_id"),
            "shared_by": share_record.get("advocate_id"),
            "shared_at": share_record.get("shared_at"),
            "download_available": True
        }
    
    @templates_router.get("/shared/{share_token}/download")
    async def download_shared_document(share_token: str):
        """Download a shared document"""
        share_record = await db.document_shares.find_one(
            {"share_token": share_token},
            {"_id": 0}
        )
        if not share_record:
            raise HTTPException(status_code=404, detail="Shared document not found or link expired")
        
        # Get the vault document
        vault_doc = await db.vault_documents.find_one(
            {"generated_doc_id": share_record["document_id"]}
        )
        if not vault_doc:
            raise HTTPException(status_code=404, detail="Document file not found")
        
        file_data = base64.b64decode(vault_doc["file_data"])
        return Response(
            content=file_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={vault_doc['original_filename']}"
            }
        )
    
    return templates_router
