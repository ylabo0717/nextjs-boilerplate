'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
});

/**
 * Example page demonstrating form validation and UI components
 *
 * @returns Example page with form and validation demo
 *
 * @public
 */
export default function ExamplePage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      name: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    toast.success('Form submitted successfully', {
      description: `Name: ${values.name}, Email: ${values.email}`,
    });
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-8 text-4xl font-bold">Next.js Boilerplate Example</h1>

      <div
        className={`
        grid gap-6
        md:grid-cols-2
      `}
      >
        <Card>
          <CardHeader>
            <CardTitle>Sample Form</CardTitle>
            <CardDescription>Example form using React Hook Form + Zod validation</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Taro Yamada" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@email.com" {...field} />
                      </FormControl>
                      <FormDescription>Please enter your contact email address</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Submit</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
            <CardDescription>shadcn/ui button variations showcase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
