import { useState } from 'react'
import './App.css'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './components/ui/form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { AlertCircle, Calendar, CheckCircle2, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover'
import { cn } from './lib/utils'
import { format } from 'date-fns'
import { Calendar as CalendarComponent } from './components/ui/calendar'

// Define form schema with Zod
const formSchema = z.object({
  projectId: z.string().min(1, { message: 'Project ID is required' }),
  token: z.string().optional(),
  endTime: z.date().optional(),
  sprintLabel: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

function App() {
  const [chartUrl, setChartUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Initialize form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: '',
      token: '',
    },
  })

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    setChartUrl(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append('project-id', data.projectId)

      if (data.token) {
        params.append('token', data.token)
      }

      if (data.endTime) {
        const formattedDate = format(data.endTime, 'yyyy-MM-dd')
        params.append('end-date', formattedDate)
      }

      if (data.sprintLabel) {
        params.append('sprint-label', data.sprintLabel)
      }

      // Make API request
      const response = await fetch(`/burndown?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate burndown chart')
      }

      const result = await response.json()
      setChartUrl(result.burndownChart)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Function to copy URL to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        // Show a temporary success message or toast
        alert('URL copied to clipboard!');
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  // Function to download the image
  const downloadImage = (url: string, filename = 'burndown-chart.png') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto py-10 px-4 md:max-w-6xl flex flex-col min-h-[calc(100vh-2rem)]">
      <div className={`flex flex-col lg:flex-row lg:gap-8 ${chartUrl ? 'lg:items-start' : 'items-center justify-center'}`}>
        {/* Left side - Form */}
        <div
          className={`w-full ${chartUrl ? 'lg:w-1/3 animate-slide-left' : 'lg:max-w-md mx-auto'} mb-8 lg:mb-0 transition-all duration-500`}>
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">GitHub Project Burndown Chart</CardTitle>
              <CardDescription>
                Generate a burndown chart for your GitHub project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project ID*</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter GitHub project ID" {...field} />
                        </FormControl>
                        <FormDescription>
                          The ID of your GitHub project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Token</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter GitHub token (optional)"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Your GitHub personal access token (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Optional end date for the burndown chart (defaults to today)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sprintLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sprint Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter sprint label" {...field} />
                        </FormControl>
                        <FormDescription>
                          Optional sprint label to filter by
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : "Generate Burndown Chart"}
                  </Button>
                </form>
              </Form>

              {error && (
                <Alert variant="destructive" className="mt-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && !chartUrl && (
                <Alert className="mt-6 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Success</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Burndown chart generated successfully!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side - Chart Display */}
        {chartUrl && (
          <div className="w-full lg:w-2/3">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-xl font-medium">Burndown Chart</CardTitle>
                <CardDescription>
                  Visualization of your project's progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image display */}
                <div className="border rounded-md p-2 w-full">
                  <img
                    src={chartUrl}
                    alt="Burndown Chart"
                    className="w-full h-auto"
                  />
                </div>

                {/* URL and action buttons */}
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm font-medium">Image URL:</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={window.location.origin + chartUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(window.location.origin + chartUrl)}
                        title="Copy URL"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => downloadImage(chartUrl)}
                      className="flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      Download Chart
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-8 pb-6 text-center text-sm text-muted-foreground">
        <p>
          Built with <span className="text-red-500">❤</span> by <a href="https://bojin.co" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">Bojin Li</a> © {new Date().getFullYear()}
        </p>
        <p className="mt-1">
          <a href="https://github.com/xxxbrian/github-projects-agile" target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            GitHub Repository (build {__COMMIT_HASH__})
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
