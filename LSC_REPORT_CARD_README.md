# LSC (Lower Secondary Curriculum) Report Card Implementation

## Overview

This document describes the implementation of LSC (Lower Secondary Curriculum) report cards following Uganda's NCDC (National Curriculum Development Centre) standards.

## Features

### 1. LSC-Compliant Grading Scale (1-9 System)
- **Grade 1**: 90-100 (Excellent)
- **Grade 2**: 80-89 (Very Good)
- **Grade 3**: 70-79 (Good)
- **Grade 4**: 60-69 (Above Average)
- **Grade 5**: 50-59 (Average)
- **Grade 6**: 40-49 (Below Average)
- **Grade 7**: 30-39 (Poor)
- **Grade 8**: 20-29 (Very Poor)
- **Grade 9**: 0-19 (Fail)

### 2. Standard LSC Subjects

**Languages:**
- English Language (ENG)
- Local Language (LAN)

**Mathematics & Sciences:**
- Mathematics (MAT)
- Integrated Science (SCI)

**Social Studies:**
- Social Studies (SST)
- Religious and Moral Education (RVE)

**Technical/Vocational:**
- Agriculture (AGR)
- Technical Drawing/Woodwork (TEK)
- Home Economics (HEC)

**Other Subjects:**
- Physical Education (PE)
- Art and Design (ART)
- Music (MUS)

### 3. Key Competencies

The system tracks 6 key competencies rated on a 1-5 scale:

1. **Problem Solving (PS)** - Ability to analyze and solve problems
2. **Communication (CC)** - Ability to communicate ideas clearly
3. **Collaboration/Teamwork (CW)** - Ability to work effectively with others
4. **Critical Thinking (CP)** - Ability to think critically and reflectively
5. **Creativity/Innovation (CD)** - Ability to think creatively and innovate
6. **Learning to Learn (LM)** - Ability to engage in lifelong learning

### 4. Behaviour & Conduct

Tracks three aspects:
- **Attendance**: Excellent/Good/Present/Absent
- **Punctuality**: Excellent/Good/Fair/Poor
- **Conduct**: Excellent/Very Good/Good/Satisfactory/Unsatisfactory

### 5. Report Card Sections

- **Header**: School name, logo, motto, contact information
- **Term Information**: Term, Academic year, Class, Publication date
- **Student Information**: Name, Admission number, Date of birth, Gender
- **Academic Results**: Subjects with scores, grades, and achievement levels
- **Class Ranking**: Student rank and class average
- **Key Competencies**: 5-point rating scale for each competency
- **Behaviour & Conduct**: Attendance, punctuality, and conduct ratings
- **Teacher's Remarks**: Qualitative feedback from teacher
- **Promotion Status**: Promoted/On Probation/Retained
- **Grading Key**: Reference for grade scale
- **Signatures**: Class Teacher, Parent/Guardian, Head Teacher

## File Structure

```
src/
├── lib/
│   └── lsc-report-card-utils.ts          # Utilities, grading scale, competencies
├── components/
│   └── report-cards/
│       ├── LSCReportCardPreview.tsx       # Print-ready report card display
│       └── LSCReportCardEditor.tsx        # Report card editing interface
```

## Utilities

### `lsc-report-card-utils.ts`

**Types:**
- `LSCGradingScale`: Grade definition with min/max scores, description, color
- `LSCSubject`: Subject definition
- `LSCCompetency`: Competency definition
- `LSCReportCardConfig`: Configuration for report cards
- `LSCReportCardData`: Report card display data

**Constants:**
- `LSC_GRADING_SCALE`: 1-9 grading scale with colors
- `LSC_STANDARD_SUBJECTS`: Pre-configured LSC subjects
- `LSC_COMPETENCIES`: Pre-configured competencies
- `BEHAVIOUR_RATINGS`: Behaviour rating options

**Functions:**
- `getGradeFromScore(score: number): string` - Get grade from numeric score
- `getGradeDescription(score: number): string` - Get description for grade
- `getGradeScale(score: number): LSCGradingScale` - Get full grade entry
- `getGradeColor(score: number): string` - Get hex color for grade
- `calculateOverallAchievement(averageScore: number): string` - Calculate achievement level
- `getDefaultLSCReportCardConfig(schoolName: string): LSCReportCardConfig` - Get default config

## Components

### LSCReportCardPreview

Display-only component for viewing and printing LSC report cards.

**Props:**
```typescript
{
  reportCardId: string;
  onClose: () => void;
}
```

**Features:**
- Beautiful print layout following NCDC standards
- Professional header with school branding
- Tabulated academic results with grades
- Competency rating visualization
- Behaviour & conduct section
- Teacher remarks
- Promotion status
- Three-part signature area (Class Teacher, Parent/Guardian, Head Teacher)
- Print and PDF download buttons
- Print-optimized CSS for A4 paper

### LSCReportCardEditor

Interactive editor for creating and updating LSC report cards.

**Props:**
```typescript
{
  reportCard: any;
  onClose: () => void;
}
```

**Features:**
- Tabbed interface:
  - **Academic Results**: Enter scores for each subject
  - **Competencies**: Rate key competencies (1-5)
  - **Behaviour**: Set attendance, punctuality, conduct
  - **Remarks**: Add teacher remarks and promotion status
- Real-time grade calculation from scores
- Class ranking management
- Pre-populated LSC subjects and competencies
- Saves to database automatically

## Integration with Existing System

The LSC components integrate with the existing report card infrastructure:

1. **Database**: Uses existing `student_report_cards`, `report_card_scores`, `report_card_skills` tables
2. **Queries**: Supports filtering by term, class, and student
3. **Templates**: Can be used as a report card template option in the ReportCards management page
4. **Delivery**: Compatible with automated report delivery (email PDFs to parents)

## Usage

### In ReportCards Management Page

```typescript
import { LSCReportCardEditor } from "@/components/report-cards/LSCReportCardEditor";
import { LSCReportCardPreview } from "@/components/report-cards/LSCReportCardPreview";

// When editing a report card with LSC format:
<LSCReportCardEditor reportCard={selectedCard} onClose={handleClose} />

// When viewing/printing:
<LSCReportCardPreview reportCardId={cardId} onClose={handleClose} />
```

### Creating an LSC Template

```typescript
import { getDefaultLSCReportCardConfig } from "@/lib/lsc-report-card-utils";

const config = getDefaultLSCReportCardConfig("Your School Name");

// Use config to create report_card_templates entry
await supabase
  .from('report_card_templates')
  .insert({
    tenant_id,
    name: 'LSC Report Card',
    level: 'lower-secondary',
    layout_config: config,
    grading_scale: config.gradingScale,
    is_default: true,
  });
```

## Customization

To customize LSC report cards for your school:

1. **Modify Grading Scale**: Edit `LSC_GRADING_SCALE` in `lsc-report-card-utils.ts`
2. **Add/Remove Subjects**: Update `LSC_STANDARD_SUBJECTS`
3. **Change Competencies**: Modify `LSC_COMPETENCIES`
4. **Adjust Layout**: Edit CSS in `LSCReportCardPreview.tsx`
5. **Add/Remove Sections**: Modify the sections object in `getDefaultLSCReportCardConfig()`

## Compliance

This implementation follows:
- Uganda NCDC Lower Secondary Curriculum guidelines
- Standard grading scales used by Ugandan schools
- NCDC-recommended competency framework
- Professional report card design standards

## Future Enhancements

1. **PDF Export**: Add library integration for automatic PDF generation
2. **Batch Report Generation**: Generate all class reports at once
3. **Signature Upload**: Allow digital signature capture
4. **Multi-language**: Support Luganda and other local languages
5. **Customizable Templates**: Allow schools to design custom layouts
6. **Analysis Reports**: Generate class performance analytics
7. **Parent Portal**: Allow parents to view their child's LSC report card online
8. **SMS Notifications**: Send grade notifications to parents

## Support

For issues or questions about LSC report cards, refer to:
- NCDC Guidelines: https://www.ncdc.go.ug/
- Uganda Ministry of Education: https://www.education.go.ug/
- This codebase documentation
