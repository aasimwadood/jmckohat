import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ControllerPoliciesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grading Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1">Grade</th>
                <th className="py-1">Range</th>
                <th className="py-1">Grade Point</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">A</td>
                <td>85 - 100</td>
                <td>4.0</td>
              </tr>
              <tr>
                <td className="py-1">B</td>
                <td>70 - 84</td>
                <td>3.0</td>
              </tr>
              <tr>
                <td className="py-1">C</td>
                <td>60 - 69</td>
                <td>2.0</td>
              </tr>
              <tr>
                <td className="py-1">D</td>
                <td>50 - 59</td>
                <td>1.0</td>
              </tr>
              <tr>
                <td className="py-1">F</td>
                <td>Below 50</td>
                <td>0.0</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance &amp; Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-600">
          <p>Minimum 75% attendance is required to sit for final examinations.</p>
          <p>Assessment weightage: Quizzes 15% · Assignments 15% · Midterm 30% · Final 40%.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rechecking Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-600">
          <p>Rechecking requests must be submitted within 7 days of result announcement.</p>
          <p>A fee of PKR 500 per course applies.</p>
          <p>Results are communicated within 15 working days.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unfair Means</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600">
          <p>The college enforces a zero-tolerance policy for unfair means during examinations.</p>
        </CardContent>
      </Card>
    </div>
  );
}
